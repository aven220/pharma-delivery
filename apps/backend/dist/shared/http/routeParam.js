"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeParam = routeParam;
/** Normaliza parámetros de ruta Express (string | string[] → string). */
function routeParam(value) {
    if (value == null)
        return '';
    return Array.isArray(value) ? value[0] : value;
}
