"""URL configuration for Word Embeddings Playground"""

from django.urls import path, include

urlpatterns = [
    path("", include("embeddings.urls")),
]
