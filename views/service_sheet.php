<!-- =====================================================
    FICHA DE SERVICIO
    Panel de la ficha técnica: cliente, categorías (color, tratamiento, corte) y productos usados.
====================================================== -->
<div class="side-drawer-overlay" id="quickEntryOverlay"></div>

<aside class="side-drawer" id="quickEntryPanel"
    role="dialog" aria-modal="true" aria-labelledby="quickEntryTitle" aria-hidden="true" tabindex="-1">

    <div class="surface__header">
        <h3 class="surface__title" id="quickEntryTitle">Ficha de servicio</h3>
        <div class="surface__actions">
            <button type="button" class="surface__close" id="quickEntryClose" aria-label="Cerrar"></button>
        </div>
    </div>

    <form class="drawer-form" id="quickEntryForm" novalidate autocomplete="off">
        <div class="surface__body">

            <!-- CLIENTE -->
            <div class="form-group is-required">
                <label for="quickEntryClientSearch">Cliente</label>

                <div class="selected-chip" id="quickClientSelected" role="group" aria-label="Cliente elegido" hidden>
                    <div class="selected-chip__main">
                        <span class="selected-chip__title" id="quickClientChipTitle"></span>
                        <span class="selected-chip__meta" id="quickClientChipMeta"></span>
                    </div>
                    <div class="selected-chip__actions">
                        <button type="button" class="btn btn--ghost btn--sm" id="quickClientChange">Cambiar</button>
                    </div>
                </div>

                <div class="search-field">
                    <input type="text" id="quickEntryClientSearch" class="input-base" aria-required="true" placeholder="Buscar por nombre o código, o escribir un alias" aria-describedby="quickClientHelp" autocomplete="off">
                    <ul class="autocomplete-list" id="clientSuggestions"></ul>
                </div>
                <input type="hidden" id="quickEntryClientId">

                <p class="form-hint" id="quickClientHelp">Elegí un cliente registrado o usá lo que escribas como alias.</p>
            </div>

            <!-- CATEGORÍAS -->
            <div class="form-group">
                <span class="form-label" id="quickCatLabel">Servicios realizados</span>
                <div
                    class="panel-filters quick-categories"
                    id="quickCategories"
                    role="tablist"
                    aria-labelledby="quickCatLabel">

                    <button type="button" class="btn-filter quick-cat-btn" data-category="general" id="quickTabGeneral"
                        role="tab" aria-selected="false" aria-controls="panelGeneral">
                        General
                    </button>

                    <button type="button" class="btn-filter quick-cat-btn" data-category="color" id="quickTabColor"
                        role="tab" aria-selected="false" aria-controls="panelColor">
                        Color
                    </button>

                    <button type="button" class="btn-filter quick-cat-btn" data-category="treatment" id="quickTabTreatment"
                        role="tab" aria-selected="false" aria-controls="panelTreatment">
                        Tratamiento
                    </button>

                    <button type="button" class="btn-filter quick-cat-btn" data-category="cut" id="quickTabCut"
                        role="tab" aria-selected="false" aria-controls="panelCut">
                        Corte
                    </button>

                </div>
                <p class="form-hint">Podés completar más de una categoría. Las que ya tienen datos se pintan de dorado.</p>
            </div>

            <!-- PANEL: COLOR -->
            <div id="panelColor" class="dynamic-panel" data-panel-title="Color"
                data-category="color" role="tabpanel" aria-labelledby="quickTabColor" tabindex="-1">
                <div class="form-row">
                    <div class="form-group">
                        <label for="colorType">Tipo de color</label>
                        <input type="text" id="colorType" class="input-base" placeholder="Ej: caoba, chocolate, rubio ceniza">
                    </div>
                    <div class="form-group">
                        <label for="colorOxidantRatio">Proporción</label>
                        <input type="text" id="colorOxidantRatio" class="input-base" placeholder="Ej: 1:1">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="colorFormula">Fórmula / tono</label>
                        <input type="text" id="colorFormula" class="input-base" placeholder="Ej: 60g 7.1 + 30g 8.1">
                    </div>

                    <div class="form-group">
                        <label for="colorBrand">Marca / línea</label>
                        <input type="text" id="colorBrand" class="input-base" placeholder="Ej: Wella Koleston">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="colorQuantityValue">Cantidad de color</label>
                        <div class="input-with-unit">
                            <input type="number" id="colorQuantityValue" class="input-base" min="1" step="1" inputmode="numeric" placeholder="Ej: 50">
                            <span>g</span>
                        </div>
                        <div class="preset-chips" role="group" aria-label="Valores frecuentes de cantidad de color" data-for="colorQuantityValue">
                            <button type="button" class="btn-filter preset-chip" data-value="30" aria-pressed="false">30</button>
                            <button type="button" class="btn-filter preset-chip" data-value="40" aria-pressed="false">40</button>
                            <button type="button" class="btn-filter preset-chip" data-value="50" aria-pressed="false">50</button>
                            <button type="button" class="btn-filter preset-chip" data-value="60" aria-pressed="false">60</button>
                            <button type="button" class="btn-filter preset-chip" data-value="80" aria-pressed="false">80</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="colorOxidantValue">Oxidante</label>
                        <div class="input-with-unit">
                            <input type="number" id="colorOxidantValue" class="input-base" min="1" step="1" inputmode="numeric" placeholder="Ej: 20">
                            <span>vol</span>
                        </div>
                        <div class="preset-chips" role="group" aria-label="Valores frecuentes de oxidante" data-for="colorOxidantValue">
                            <button type="button" class="btn-filter preset-chip" data-value="10" aria-pressed="false">10</button>
                            <button type="button" class="btn-filter preset-chip" data-value="20" aria-pressed="false">20</button>
                            <button type="button" class="btn-filter preset-chip" data-value="30" aria-pressed="false">30</button>
                            <button type="button" class="btn-filter preset-chip" data-value="40" aria-pressed="false">40</button>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="colorTimeValue">Exposición</label>
                    <div class="input-with-unit">
                        <input type="number" id="colorTimeValue" class="input-base" min="1" step="1" inputmode="numeric" placeholder="Ej: 35">
                        <span>min</span>
                    </div>
                    <div class="preset-chips" role="group" aria-label="Valores frecuentes de exposición" data-for="colorTimeValue">
                        <button type="button" class="btn-filter preset-chip" data-value="20" aria-pressed="false">20</button>
                        <button type="button" class="btn-filter preset-chip" data-value="30" aria-pressed="false">30</button>
                        <button type="button" class="btn-filter preset-chip" data-value="35" aria-pressed="false">35</button>
                        <button type="button" class="btn-filter preset-chip" data-value="45" aria-pressed="false">45</button>
                        <button type="button" class="btn-filter preset-chip" data-value="60" aria-pressed="false">60</button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="colorApplication">Aplicación</label>
                    <input type="text" id="colorApplication" class="input-base" list="colorApplicationOptions" placeholder="Elegí una opción o escribí otra">
                    <datalist id="colorApplicationOptions">
                        <option value="Raíz"></option>
                        <option value="Global"></option>
                        <option value="Mechas"></option>
                        <option value="Balayage"></option>
                        <option value="Puntas"></option>
                        <option value="Baño de color"></option>
                    </datalist>
                </div>

                <div class="form-group">
                    <label for="colorResult">Resultado / corrección</label>
                    <input type="text" id="colorResult" class="input-base" placeholder="Ej: tono cálido, raíz más clara, corrección de amarillo">
                </div>
            </div>

            <!-- PANEL: TRATAMIENTO -->
            <div id="panelTreatment" class="dynamic-panel" data-panel-title="Tratamiento"
                data-category="treatment" role="tabpanel" aria-labelledby="quickTabTreatment" tabindex="-1">
                <div class="form-group">
                    <label for="treatmentType">Tipo de tratamiento</label>
                    <input type="text" id="treatmentType" class="input-base" list="treatmentTypeOptions" placeholder="Elegí una opción o escribí otra">
                    <datalist id="treatmentTypeOptions">
                        <option value="Alisado"></option>
                        <option value="Hidratación"></option>
                        <option value="Nutrición"></option>
                        <option value="Reconstrucción"></option>
                        <option value="Keratina"></option>
                        <option value="Botox capilar"></option>
                    </datalist>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="treatmentProduct">Producto / línea</label>
                        <input type="text" id="treatmentProduct" class="input-base" placeholder="Ej: Alisado Láser Orgánico">
                    </div>

                    <div class="form-group">
                        <label for="treatmentMlValue">Cantidad aplicada</label>
                        <div class="input-with-unit">
                            <input type="number" id="treatmentMlValue" class="input-base" min="1" step="1" inputmode="numeric" placeholder="Ej: 60">
                            <span>ml</span>
                        </div>
                        <div class="preset-chips" role="group" aria-label="Valores frecuentes de cantidad aplicada" data-for="treatmentMlValue">
                            <button type="button" class="btn-filter preset-chip" data-value="30" aria-pressed="false">30</button>
                            <button type="button" class="btn-filter preset-chip" data-value="60" aria-pressed="false">60</button>
                            <button type="button" class="btn-filter preset-chip" data-value="100" aria-pressed="false">100</button>
                            <button type="button" class="btn-filter preset-chip" data-value="150" aria-pressed="false">150</button>
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="treatmentTempValue">Temperatura de plancha</label>
                        <div class="input-with-unit">
                            <input type="number" id="treatmentTempValue" class="input-base" min="1" step="1" inputmode="numeric" placeholder="Ej: 200">
                            <span>°C</span>
                        </div>
                        <div class="preset-chips" role="group" aria-label="Valores frecuentes de temperatura de plancha" data-for="treatmentTempValue">
                            <button type="button" class="btn-filter preset-chip" data-value="160" aria-pressed="false">160</button>
                            <button type="button" class="btn-filter preset-chip" data-value="180" aria-pressed="false">180</button>
                            <button type="button" class="btn-filter preset-chip" data-value="200" aria-pressed="false">200</button>
                            <button type="button" class="btn-filter preset-chip" data-value="210" aria-pressed="false">210</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="treatmentPassesValue">Pasadas por mecha</label>
                        <div class="input-with-unit">
                            <input type="number" id="treatmentPassesValue" class="input-base" min="1" step="1" inputmode="numeric" placeholder="Ej: 10">
                            <span>pasadas</span>
                        </div>
                        <div class="preset-chips" role="group" aria-label="Valores frecuentes de pasadas por mecha" data-for="treatmentPassesValue">
                            <button type="button" class="btn-filter preset-chip" data-value="5" aria-pressed="false">5</button>
                            <button type="button" class="btn-filter preset-chip" data-value="8" aria-pressed="false">8</button>
                            <button type="button" class="btn-filter preset-chip" data-value="10" aria-pressed="false">10</button>
                            <button type="button" class="btn-filter preset-chip" data-value="12" aria-pressed="false">12</button>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="treatmentProcess">Proceso realizado</label>
                    <input type="text" id="treatmentProcess" class="input-base" list="treatmentProcessOptions" placeholder="Ej: lavado previo, secado, planchado por secciones">
                    <datalist id="treatmentProcessOptions">
                        <option value="Lavado previo"></option>
                        <option value="Secado"></option>
                        <option value="Planchado por secciones"></option>
                        <option value="Enjuague"></option>
                    </datalist>
                </div>

                <div class="form-group">
                    <label for="treatmentResult">Resultado</label>
                    <input type="text" id="treatmentResult" class="input-base" placeholder="Ej: brillo, suavidad, menos frizz">
                </div>
            </div>

            <!-- PANEL: CORTE -->
            <div id="panelCut" class="dynamic-panel" data-panel-title="Corte"
                data-category="cut" role="tabpanel" aria-labelledby="quickTabCut" tabindex="-1">
                <div class="form-group">
                    <label for="cutType">Tipo de corte</label>
                    <input type="text" id="cutType" class="input-base" list="cutTypeOptions" placeholder="Elegí una opción o escribí otra">
                    <datalist id="cutTypeOptions">
                        <option value="Degradé"></option>
                        <option value="Recto"></option>
                        <option value="Capas"></option>
                        <option value="Bob"></option>
                        <option value="Pixie"></option>
                    </datalist>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="cutLength">Largo / referencia</label>
                        <input type="text" id="cutLength" class="input-base" placeholder="Ej: 3 cm, a la clavícula, conservar largo">
                    </div>

                    <div class="form-group">
                        <label for="cutCondition">Condición</label>
                        <input type="text" id="cutCondition" class="input-base" placeholder="Ej: puntas abiertas, cabello fino">
                    </div>
                </div>

                <div class="form-group">
                    <label for="cutTools">Técnicas / herramientas</label>
                    <input type="text" id="cutTools" class="input-base" list="cutToolsOptions" placeholder="Elegí una opción o escribí otra">
                    <datalist id="cutToolsOptions">
                        <option value="Tijera"></option>
                        <option value="Navaja"></option>
                        <option value="Máquina"></option>
                        <option value="Texturizado"></option>
                        <option value="Desfilado"></option>
                    </datalist>
                </div>

                <div class="form-group">
                    <label for="cutFinish">Terminación</label>
                    <input type="text" id="cutFinish" class="input-base" list="cutFinishOptions" placeholder="Elegí una opción o escribí otra">
                    <datalist id="cutFinishOptions">
                        <option value="Secado natural"></option>
                        <option value="Brushing"></option>
                        <option value="Planchado"></option>
                        <option value="Ondas con tenaza"></option>
                    </datalist>
                </div>
            </div>

            <!-- PANEL: GENERAL (PRODUCTOS Y OBSERVACIONES) -->
            <div id="panelGeneral" class="dynamic-panel" data-panel-title="General y productos"
                data-category="general" role="tabpanel" aria-labelledby="quickTabGeneral" tabindex="-1">
                <div class="form-group">
                    <div class="panel-controls">
                        <label for="quickEntryProductSearch">Productos usados</label>
                        <div class="search-field">
                            <input
                                class="panel-search"
                                type="text"
                                id="quickEntryProductSearch"
                                placeholder="Buscar producto por nombre"
                                autocomplete="off">
                            <ul class="autocomplete-list" id="quickEntryProductSuggestions"></ul>
                        </div>
                    </div>
                    <table class="data-table" id="quickEntryProductsTable">
                        <caption class="sr-only">Productos usados en la sesión</caption>
                        <thead>
                            <tr>
                                <th scope="col">Cantidad</th>
                                <th scope="col">Unidad</th>
                                <th scope="col">Nombre</th>
                                <th scope="col">Marca</th>
                                <th scope="col">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="quickEntryProductsTableBody">
                            <tr>
                                <td colspan="5" class="panel-empty">
                                    Todavía no agregaste productos.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <template id="cartEmptyTemplate">
                        <tr><td colspan="5" class="panel-empty">Todavía no agregaste productos.</td></tr>
                    </template>
                    <template id="cartRowTemplate">
                        <tr>
                            <td data-label="Cantidad">
                                <input type="number" min="1" step="1" inputmode="numeric" class="cart-quantity">
                            </td>
                            <td data-label="Unidad" data-field="unit"></td>
                            <td data-label="Nombre" data-field="name"></td>
                            <td data-label="Marca" data-field="brand"></td>
                            <td data-label="Acciones">
                                <button type="button" class="cart-remove" title="Quitar"></button>
                            </td>
                        </tr>
                    </template>
                </div>

                <div class="form-group">
                    <label for="sessionNotes">Observaciones de la sesión</label>
                    <textarea id="sessionNotes" class="input-base" rows="3" placeholder="Reacción del cabello, fórmula complementaria, zonas a cuidar"></textarea>
                </div>

                <div class="form-group">
                    <label for="nextVisitNotes">Para la próxima visita</label>
                    <textarea id="nextVisitNotes" class="input-base" rows="2" placeholder="Ej: mantener fórmula, retocar raíz, no cortar flequillo"></textarea>
                </div>
            </div>

            <p class="form-hint">Los campos con * son obligatorios.</p>

        </div>

        <!-- FOOTER -->
        <div class="surface__footer surface__footer--actions">
            <button type="button" class="btn btn--ghost" id="quickEntryCancel">
                Cancelar
            </button>
            <button type="button" class="btn btn--ghost" id="quickEntryBack" hidden>
                Volver
            </button>
            <button type="button" class="btn btn--ghost" id="quickEntryFinishOnly" hidden>
                Finalizar sin ficha
            </button>
            <button type="submit" class="btn btn--primary" id="quickEntrySave">
                Guardar ficha
            </button>
        </div>
    </form>

</aside>