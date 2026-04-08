# Word Embeddings Playground (word_)
An interactive web application designed to help users explore word vectors, compute semantic analogies, and visualize high-dimensional language data in an accessible way.

Powered by spaCy (*en_core_web_lg*), the app utilizes 685,000 word vectors across 300 dimensions to bring natural language processing concepts to life.

### Features
**1. Word Analogy**<br>
<img width="1512" height="949" alt="Screenshot 2026-04-08 at 12 51 27" src="https://github.com/user-attachments/assets/5827b2a9-1945-400d-b5d5-74dfe95b1fff" />
Compute vector math using the formula A - B + C = ? to discover fascinating semantic relationships. Enter base words to see how the model understands context and relationships (e.g., solving paris - france + germany to yield berlin).

**2. Visualize Vectors**<br>
<img width="1512" height="949" alt="Screenshot 2026-04-08 at 12 51 20" src="https://github.com/user-attachments/assets/d7d94d4b-1cc2-4890-8aa7-e821412905f5" />
See how words cluster in semantic space. Input a comma-separated list of words (like animals, foods, or concepts), and the app will project their 300-dimensional vectors onto a 2D scatter plot, color-coding them to show how similar words naturally cluster together.

**3. Daily Challenge (Semantic Guessing Game)**<br>
<img width="1512" height="949" alt="Screenshot 2026-04-08 at 12 52 12" src="https://github.com/user-attachments/assets/4eaf0f9b-7d81-41fe-93d0-0869dba374aa" />
Test your intuition about word embeddings! Guess today's secret word based entirely on semantic similarity scores.<br>
Every guess returns a percentage score (0% = completely unrelated, 100% = exact match).<br>
Use the color-coded feedback thresholds (Cold, Warm, Hot, Very Hot) to narrow down the semantic neighborhood and find the secret word.<br>
*(also there are some hints)*

**Tech Stack**<br>
* **Backend Framework:** Django
* **NLP & Data:** spaCy (en_core_web_lg - 300-dimensional vectors, 685K vocabulary)
* **Frontend Interactivity:** HTMX & Alpine.js
* **Styling:** Tailwind CSS

### Getting Started

Set up the Python environment:

```Bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install backend dependencies
pip install -r requirements.txt

# Download the spaCy language model
python -m spacy download en_core_web_lg
```

Run the development server:

```Bash
python manage.py runserver
```
