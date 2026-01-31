"""URL patterns for embeddings app"""

from django.urls import path

from . import views

urlpatterns = [
    # Home
    path("", views.home, name="home"),
    # Word Analogy
    path("analogy/", views.analogy, name="analogy"),
    path("analogy/calculate/", views.analogy_calculate, name="analogy_calculate"),
    # Visualization
    path("visualize/", views.visualize, name="visualize"),
    path("visualize/calculate/", views.visualize_calculate, name="visualize_calculate"),
    # Daily Game
    path("game/", views.daily_game, name="daily_game"),
    path("game/guess/", views.daily_guess, name="daily_guess"),
    path("game/word/", views.daily_word_api, name="daily_word_api"),
    path("game/hint/", views.daily_hint, name="daily_hint"),
]
