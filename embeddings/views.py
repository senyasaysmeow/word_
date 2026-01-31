"""
Views for Word Embeddings Playground
"""

import json

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods

from . import services


def home(request):
    """Landing page"""
    return render(request, "home.html")


def analogy(request):
    """Word analogy calculator page"""
    return render(request, "analogy.html")


@require_http_methods(["POST"])
def analogy_calculate(request):
    """HTMX endpoint for analogy calculation"""
    word_a = request.POST.get("word_a", "").strip()
    word_b = request.POST.get("word_b", "").strip()
    word_c = request.POST.get("word_c", "").strip()

    if not all([word_a, word_b, word_c]):
        return render(
            request,
            "partials/analogy_results.html",
            {"error": "Please fill in all three words"},
        )

    result = services.calculate_analogy(word_a, word_b, word_c)

    return render(
        request,
        "partials/analogy_results.html",
        {
            "results": result.get("results", []),
            "equation": result.get("equation", ""),
            "error": result.get("error"),
        },
    )


def visualize(request):
    """Word vector visualization page"""
    return render(request, "visualize.html")


@require_http_methods(["POST"])
def visualize_calculate(request):
    """HTMX/JSON endpoint for visualization coordinates"""
    words_raw = request.POST.get("words", "")

    # Parse comma-separated words
    words = [w.strip() for w in words_raw.split(",") if w.strip()]

    if len(words) < 2:
        return JsonResponse(
            {"error": "Please enter at least 2 words", "coordinates": {}}
        )

    result = services.get_vectors_2d(words)

    return JsonResponse(result)


def daily_game(request):
    """Daily word guessing game page"""
    return render(request, "daily_game.html")


@require_http_methods(["POST"])
def daily_guess(request):
    """HTMX endpoint for checking a guess"""
    guess = request.POST.get("guess", "").strip()

    if not guess:
        return render(
            request, "partials/guess_result.html", {"error": "Please enter a word"}
        )

    result = services.check_guess(guess)

    return render(
        request,
        "partials/guess_result.html",
        {
            "guess": guess,
            "similarity": result.get("similarity"),
            "correct": result.get("correct", False),
            "error": result.get("error"),
        },
    )


@require_http_methods(["GET"])
def daily_word_api(request):
    """API endpoint to get today's word (for debugging/admin)"""
    # Only enable in debug mode or with secret key
    from django.conf import settings

    if not settings.DEBUG:
        return JsonResponse({"error": "Not available"}, status=403)

    word = services.get_daily_word()
    return JsonResponse({"word": word})


@require_http_methods(["GET"])
def daily_hint(request):
    """API endpoint to get hints for today's word"""
    hints = services.get_hint()
    return JsonResponse(hints)
