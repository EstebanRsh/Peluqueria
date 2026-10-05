<!-- =====================================================
    REGISTRO DE SERVICIO RÁPIDO
====================================================== -->
<div class="side-drawer-overlay" id="quickEntryOverlay"></div>

<aside class="side-drawer side-drawer--wide" id="quickEntryPanel" aria-hidden="true">

    <div class="day-panel__header">
        <h3 class="day-panel__date">Ficha de Servicio</h3>
        <div class="day-panel__actions">
            <button class="day-panel__close" id="quickEntryClose" aria-label="Cerrar">×</button>
        </div>
    </div>

    <div class="day-panel__body">

        <!-- CLIENT SEARCH -->
        <div class="form-row">
            <div class="form-group form-group--full">
                <label for="quickEntryClientSearch">Cliente</label>
                <input type="text" id="quickEntryClientSearch" class="input-base" placeholder="Buscar por nombre o alias..." autocomplete="off">
                <ul class="autocomplete-list" id="clientSuggestions" style="display: none;"></ul>
                <input type="hidden" id="quickEntryClientId">
            </div>
        </div>
        <div class="form-group">
            <label id="quickCatLabel">Servicios realizados</label>
            <div
                class="panel-filters quick-categories"
                id="quickCategories"
                role="tablist"
                aria-labelledby="quickCatLabel">

                <button type="button" class="btn-filter quick-cat-btn" data-category="general"
                    role="tab" aria-selected="false" aria-controls="panelGeneral">
                    General
                </button>

                <button type="button" class="btn-filter quick-cat-btn" data-category="color"
                    role="tab" aria-selected="false" aria-controls="panelColor">
                    Color
                </button>

                <button type="button" class="btn-filter quick-cat-btn" data-category="treatment"
                    role="tab" aria-selected="false" aria-controls="panelTreatment">
                    Tratamiento
                </button>

                <button type="button" class="btn-filter quick-cat-btn" data-category="cut"
                    role="tab" aria-selected="false" aria-controls="panelCut">
                    Corte
                </button>

            </div>
        </div>

        <!-- PANEL: COLOR -->
        <div id="panelColor" class="dynamic-panel" data-panel-title="Color"
            data-category="color" role="tabpanel" tabindex="-1">
            <div class="form-row">
                <div class="form-group">
                    <label for="colorType">Tipo de color</label>
                    <input type="text" id="colorType" class="input-base" placeholder="Ej: caoba, chocolate, rubio ceniza, etc.">
                </div>
                <div class="form-group">
                    <label for="colorOxidantRatio">Proporción</label>
                    <input type="text" id="colorOxidantRatio" class="input-base" placeholder="Ej: 1:1">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="colorFormula">Fórmula / Tono</label>
                    <input type="text" id="colorFormula" class="input-base" placeholder="Ej: 60g 7.1 + 30g 8.1">
                </div>

                <div class="form-group">
                    <label for="colorBrand">Marca / Línea</label>
                    <input type="text" id="colorBrand" class="input-base" placeholder="Ej: Wella Koleston">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="colorQuantityRange">Cantidad de color</label>
                    <div class="label-with-val">
                        <input type="range" id="colorQuantityRange" min="10" max="150" step="5" value="50" class="slider-base">
                        <div class="range-value-input">
                            <input type="number" id="colorQuantityValue" class="input-base" min="1" step="1" value="50" aria-label="Cantidad de color en gramos">
                        </div>
                        <span>gr</span>
                    </div>
                </div>

                <div class="form-group">
                    <label for="colorOxidantRange">Oxidante</label>
                    <div class="label-with-val">
                        <input type="range" id="colorOxidantRange" min="6" max="40" step="1" value="20" class="slider-base">
                        <div class="range-value-input">
                            <input type="number" id="colorOxidantValue" class="input-base" min="1" step="1" value="20" aria-label="Volumen de oxidante">
                        </div>
                        <span>Vol</span>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="colorTimeRange">Exposición</label>
                    <div class="label-with-val">
                        <input type="range" id="colorTimeRange" min="5" max="90" step="5" value="35" class="slider-base">
                        <div class="range-value-input">
                            <input type="number" id="colorTimeValue" class="input-base" min="1" step="1" value="35" aria-label="Tiempo de exposición en minutos">
                        </div>
                        <span>min</span>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label for="colorApplication">Aplicación</label>
                <input type="text" id="colorApplication" class="input-base" placeholder="Ej: Raíz, Mechas, Balayage, Global...">
            </div>

            <div class="form-group">
                <label for="colorResult">Resultado / corrección</label>
                <input type="text" id="colorResult" class="input-base" placeholder="Ej: tono cálido, raíz más clara, corrección de amarillo, etc.">
            </div>
        </div>

        <!-- PANEL: TREATMENT -->
        <div id="panelTreatment" class="dynamic-panel" data-panel-title="Tratamiento"
            data-category="treatment" role="tabpanel" tabindex="-1">
            <div class="form-group">
                <label for="treatmentType">Tipo de tratamiento</label>
                <input type="text" id="treatmentType" class="input-base" placeholder="Ej: Alisado, hidratación, reconstrucción, etc.">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="treatmentProduct">Producto / Línea</label>
                    <input type="text" id="treatmentProduct" class="input-base" placeholder="Ej: Alisado Láser Orgánico">
                </div>

                <div class="form-group">
                    <label for="treatmentMlRange">Cantidad aplicada</label>
                    <div class="label-with-val">
                        <input type="range" id="treatmentMlRange" min="10" max="300" step="5" value="60" class="slider-base">
                        <div class="range-value-input">
                            <input type="number" id="treatmentMlValue" class="input-base" min="1" step="1" value="60" aria-label="Cantidad aplicada en mililitros">
                        </div>
                        <span>ml</span>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="treatmentTempRange">Temperatura de plancha</label>
                    <div class="label-with-val">
                        <input type="range" id="treatmentTempRange" min="120" max="230" step="5" value="200" class="slider-base">
                        <div class="range-value-input">
                            <input type="number" id="treatmentTempValue" class="input-base" min="1" step="1" value="200" aria-label="Temperatura de plancha en grados Celsius">
                        </div>
                        <span>°C</span>
                    </div>
                </div>

                <div class="form-group">
                    <label for="treatmentPassesRange">Pasadas por mecha</label>
                    <div class="label-with-val">
                        <input type="range" id="treatmentPassesRange" min="1" max="20" step="1" value="10" class="slider-base">
                        <div class="range-value-input">
                            <input type="number" id="treatmentPassesValue" class="input-base" min="1" step="1" value="10" aria-label="Cantidad de pasadas por mecha">
                        </div>
                        <span>pasadas</span>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label for="treatmentProcess">Proceso realizado</label>
                <input type="text" id="treatmentProcess" class="input-base" placeholder="Ej: Lavado previo, Secado, Planchado por secciones...">
            </div>

            <div class="form-group">
                <label for="treatmentResult">Resultado</label>
                <input type="text" id="treatmentResult" class="input-base" placeholder="Ej: Brillo, Suavidad, Reducción de frizz, Alisado...">
            </div>
        </div>

        <!-- PANEL: CUT -->
        <div id="panelCut" class="dynamic-panel" data-panel-title="Corte"
            data-category="cut" role="tabpanel" tabindex="-1">
            <div class="form-group">
                <label for="cutType">Tipo de corte</label>
                <input type="text" id="cutType" class="input-base" placeholder="Ej: degradé, recto, capas, bob, pixie, etc.">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="cutLength">Largo / referencia</label>
                    <input type="text" id="cutLength" class="input-base" placeholder="Ej: 3 cm, a la clavícula, conservar largo">
                </div>

                <div class="form-group">
                    <label for="cutCondition">Condición</label>
                    <input type="text" id="cutCondition" class="input-base" placeholder="Ej: puntas abiertas, cabello fino, cabello grueso, etc.">
                </div>
            </div>

            <div class="form-group">
                <label for="cutTools">Técnicas / herramientas</label>
                <input type="text" id="cutTools" class="input-base" placeholder="Ej: tijera, navaja, texturizado, desfilado, etc.">
            </div>

            <div class="form-group">
                <label for="cutFinish">Terminación</label>
                <input type="text" id="cutFinish" class="input-base" placeholder="Ej: secado natural, blow dry, planchado, ondas con tenaza, etc.">
            </div>
        </div>

        <!-- PANEL: GENERAL (MINI POS) -->
        <div id="panelGeneral" class="dynamic-panel" data-panel-title="General / Productos"
            data-category="general" role="tabpanel" tabindex="-1">
            <div class="form-group">
                <div class="panel-controls" style="position: relative;">
                    <label for="quickEntryProductSearch" class="is-hidden">Buscar Producto</label>
                    <input
                        class="panel-search"
                        type="text"
                        id="quickEntryProductSearch"
                        placeholder="Buscar por nombre o marca..."
                        autocomplete="off">
                    <ul class="autocomplete-list" id="quickEntryProductSuggestions" style="display: none;"></ul>
                </div>
                <table class="data-table" id="quickEntryProductsTable">
                    <thead>
                        <tr>
                            <th>Cantidad</th>
                            <th>Unidad</th>
                            <th>Nombre</th>
                            <th>Marca</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="quickEntryProductsTableBody">
                        <tr>
                            <td colspan="6" class="panel-loading">
                                Por favor, cargue productos...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="form-group">
                <label for="sessionNotes">Observaciones de la sesión</label>
                <textarea id="sessionNotes" class="input-base" rows="3" placeholder="Detalles que conviene conservar: reacción del cabello, fórmula complementaria, preferencias de la clienta, zonas a cuidar, etc."></textarea>
            </div>

            <div class="form-group">
                <label for="nextVisitNotes">Para la próxima visita</label>
                <textarea id="nextVisitNotes" class="input-base" rows="2" placeholder="Ej: mantener fórmula, retocar raíz, continuar tratamiento, no cortar flequillo..."></textarea>
            </div>
        </div>

    </div>

    <!-- FOOTER -->
    <div class="appointment-detail-footer">
        <button class="btn btn--ghost" id="quickEntryCancel">
            Cancelar
        </button>
        <button class="btn btn--primary" id="quickEntrySave">
            Guardar Ficha
        </button>
    </div>

</aside>

<!-- =====================================================
    CONFIRMACIÓN: GUARDAR FICHA SIN CLIENTE REGISTRADO
    Se muestra solo cuando se intenta guardar sin haber
    seleccionado un cliente de la búsqueda (clientId vacío).
====================================================== -->
<div class="side-drawer-overlay" id="noClientOverlay"></div>

<div class="confirm-dialog" id="noClientDialog" role="alertdialog" aria-modal="true"
    aria-labelledby="noClientTitle" aria-describedby="noClientDesc" aria-hidden="true">

    <div class="confirm-dialog__icon" aria-hidden="true">⚠️</div>

    <h3 class="confirm-dialog__title" id="noClientTitle">Cliente no seleccionado</h3>

    <p class="confirm-dialog__desc" id="noClientDesc">
        No seleccionaste un cliente registrado para esta ficha. Si continuás,
        el registro va a quedar guardado sin vínculo con un cliente de la base,
        lo que puede dificultar encontrarlo más adelante.
    </p>

    <div class="confirm-dialog__actions">
        <button type="button" class="btn btn--ghost" id="noClientBack">
            Volver a buscar cliente
        </button>
        <button type="button" class="btn btn--primary" id="noClientConfirm">
            Guardar sin cliente
        </button>
    </div>
</div>

<style>
    /* ============================================================
       CONFIRM DIALOG GENÉRICO (tarjeta centrada sobre el overlay)
       Bloque autocontenido: si tenés una hoja de estilos principal,
       lo ideal es mover esto ahí y borrar este <style>.
       ============================================================ */
    .confirm-dialog {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: var(--z-modal);
        width: min(420px, 90vw);
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
        padding: 1.75rem;
        text-align: center;
    }

    .confirm-dialog.is-open {
        display: block;
    }

    #noClientOverlay.is-open {
        z-index: calc(var(--z-modal) - 1);
    }

    .confirm-dialog__icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        line-height: 1;
    }

    .confirm-dialog__title {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
    }

    .confirm-dialog__desc {
        margin: 0 0 1.5rem;
        color: #555;
        font-size: 0.95rem;
        line-height: 1.4;
    }

    .confirm-dialog__actions {
        display: flex;
        justify-content: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }
</style>