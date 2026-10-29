from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Géoportail du Maillage Sanitaire de Thiès"
admin.site.site_title = "Géoportail Thiès"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("portail.urls")),
]
