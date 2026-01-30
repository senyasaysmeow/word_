"""
Word Embedding Services using spaCy
Singleton pattern to load model once and reuse
"""

import hashlib
from datetime import date
from typing import Optional

import numpy as np
import spacy
from sklearn.decomposition import PCA

# Singleton for spaCy model
_nlp = None


def get_nlp():
    """Get or load the spaCy model (singleton pattern)"""
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_lg")
    return _nlp


def has_vector(word: str) -> bool:
    """Check if a word has a vector in the vocabulary"""
    nlp = get_nlp()
    return nlp.vocab[word].has_vector


def get_vector(word: str) -> Optional[np.ndarray]:
    """Get the vector for a word, returns None if not found"""
    nlp = get_nlp()
    lexeme = nlp.vocab[word]
    if lexeme.has_vector:
        return np.array(lexeme.vector)
    return None


def calculate_analogy(
    word_a: str, word_b: str, word_c: str, n_results: int = 10
) -> dict:
    """
    Calculate word analogy: A - B + C = ?
    Example: king - man + woman = queen

    Returns dict with 'results' list and 'error' if any
    """
    nlp = get_nlp()

    # Normalize inputs
    word_a = word_a.lower().strip()
    word_b = word_b.lower().strip()
    word_c = word_c.lower().strip()

    # Check if all words have vectors
    missing = []
    for w in [word_a, word_b, word_c]:
        if not nlp.vocab[w].has_vector:
            missing.append(w)

    if missing:
        return {"error": f"Unknown word(s): {', '.join(missing)}", "results": []}

    # Calculate: A - B + C
    vec = nlp.vocab[word_a].vector - nlp.vocab[word_b].vector + nlp.vocab[word_c].vector

    # Find most similar words
    ms = nlp.vocab.vectors.most_similar(np.asarray([vec]), n=n_results + 10)
    words_raw = [nlp.vocab.strings[w] for w in ms[0][0]]

    # Clean results: lemmatize and remove input words
    input_words = {word_a, word_b, word_c}
    results = []

    for raw_word, similarity in zip(words_raw, ms[2][0]):
        # Get lemma
        doc = nlp(raw_word)
        if doc:
            lemma = doc[0].lemma_.lower()
        else:
            lemma = raw_word.lower()

        # Skip if it's one of the input words
        if lemma in input_words or raw_word.lower() in input_words:
            continue

        # Skip duplicates
        if any(r["word"] == lemma for r in results):
            continue

        results.append({"word": lemma, "similarity": float(similarity)})

        if len(results) >= n_results:
            break

    return {
        "results": results,
        "equation": f"{word_a} - {word_b} + {word_c}",
        "error": None,
    }


def get_similarity(word1: str, word2: str) -> dict:
    """
    Calculate cosine similarity between two words
    Returns value between 0 and 100 (percentage)
    """
    nlp = get_nlp()

    word1 = word1.lower().strip()
    word2 = word2.lower().strip()

    if not nlp.vocab[word1].has_vector:
        return {"error": f"Unknown word: {word1}", "similarity": None}

    if not nlp.vocab[word2].has_vector:
        return {"error": f"Unknown word: {word2}", "similarity": None}

    vec1 = nlp.vocab[word1].vector
    vec2 = nlp.vocab[word2].vector

    # Cosine similarity
    similarity = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

    # Convert to percentage (0-100)
    # Note: cosine similarity can be negative, so we map [-1, 1] to [0, 100]
    percentage = (similarity + 1) * 50

    return {
        "similarity": round(percentage, 2),
        "raw_similarity": float(similarity),
        "error": None,
    }


def get_vectors_2d(words: list[str]) -> dict:
    """
    Get 2D coordinates for a list of words using PCA
    Returns dict with word -> (x, y) mapping
    """
    nlp = get_nlp()

    # Filter to words with vectors
    valid_words = []
    vectors = []
    missing = []

    for word in words:
        word = word.lower().strip()
        if not word:
            continue
        if nlp.vocab[word].has_vector:
            valid_words.append(word)
            vectors.append(np.array(nlp.vocab[word].vector))
        else:
            missing.append(word)

    if len(valid_words) < 2:
        return {
            "error": "Need at least 2 valid words with vectors",
            "coordinates": {},
            "missing": missing,
        }

    # Stack vectors and apply PCA
    vectors_matrix = np.vstack(vectors)

    # Use min of 2 and number of samples for n_components
    n_components = min(2, len(valid_words))
    pca = PCA(n_components=n_components)
    coords_2d = pca.fit_transform(vectors_matrix)

    # Build result
    coordinates = {}
    for i, word in enumerate(valid_words):
        coordinates[word] = {
            "x": float(coords_2d[i, 0]),
            "y": float(coords_2d[i, 1]) if n_components > 1 else 0.0,
        }

    return {"coordinates": coordinates, "missing": missing, "error": None}


# Daily word game functions
from .daily_words import DAILY_WORDS


def get_daily_word(date_obj: Optional[date] = None) -> str:
    """
    Get the daily word based on date
    Uses hash to deterministically select from word list
    """
    if date_obj is None:
        date_obj = date.today()

    # Create deterministic index from date
    date_str = date_obj.isoformat()
    hash_val = int(hashlib.sha256(date_str.encode()).hexdigest(), 16)
    index = hash_val % len(DAILY_WORDS)

    return DAILY_WORDS[index]


def check_guess(guess: str, date_obj: Optional[date] = None) -> dict:
    """
    Check a guess against the daily word
    Returns similarity percentage and whether it's correct
    """
    nlp = get_nlp()

    target = get_daily_word(date_obj)
    guess = guess.lower().strip()

    # Check if guess is valid
    if not nlp.vocab[guess].has_vector:
        return {"error": f"Unknown word: {guess}", "similarity": None, "correct": False}

    # Check for exact match
    if guess == target:
        return {"similarity": 100.0, "correct": True, "error": None}

    # Calculate similarity
    result = get_similarity(guess, target)

    if result["error"]:
        return result

    return {"similarity": result["similarity"], "correct": False, "error": None}
