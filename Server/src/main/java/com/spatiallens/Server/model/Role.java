package com.spatiallens.Server.model;

public enum Role {
    ADMIN, // Administrator (edit + publish)
    EDITOR, // Data Editor (edit only)
    VIEWER // Public Viewer (read only)
}