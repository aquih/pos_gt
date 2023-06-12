odoo.define('pos_gt.models', function (require) {
    "use strict";

    const { PosGlobalState, Order, Orderline } = require('point_of_sale.models');
    const PartnerListScreen = require('point_of_sale.PartnerListScreen');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const { Gui } = require('point_of_sale.Gui');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    const { useListener } = require("@web/core/utils/hooks");
    const { useState } = owl;
    
    const PosGTPosGlobalState = (PosGlobalState) => class PosGTPosGlobalState extends PosGlobalState {
        async _processData(loadedData) {
            await super._processData(...arguments);
            this.product_extras = {};
            for (const e of loadedData['pos_gt.extra']) {
                this.product_extras[e['id']] = e;
            }
            this.diario_facturacion = loadedData['diario_facturacion'];
        }
        add_new_order() {
            var new_order = super.add_new_order(...arguments);
            if (this.config.default_client_id) {
                new_order.set_partner(this.db.get_partner_by_id(this.config.default_client_id[0]));
            }
            if (this.config.invoice_journal_id) {
                new_order.set_to_invoice(true);
            }
            return new_order;
        }
    };
    Registries.Model.extend(PosGlobalState, PosGTPosGlobalState);
    
    const PosGTPartnerListScreen = (PartnerListScreen) => class PosGTPartnerListScreen extends PartnerListScreen {
        activateEditMode(event) {
            this.state.editModeProps.partner.vat = this.state.query;
            super.activateEditMode(event);
        }
        async saveChanges(event) {
            // Solo cambiar el valor cuando es un nuevo contaco
            if (!('id' in this.state.editModeProps.partner) && !('vat' in event.detail.processedChanges)) {
                event.detail.processedChanges.vat = this.state.query;
            }
            super.saveChanges(event);
        }
    };
    Registries.Component.extend(PartnerListScreen, PosGTPartnerListScreen);
    
    class TakeOutButton extends PosComponent {
        setup() {
            super.setup();
            useListener('click', this.onClick);
            const order = this.env.pos.get_order();
            this.state = useState({ take_out: order.take_out || false });
        }
        async onClick() {
            this.state.take_out = !this.state.take_out;
            const order = this.env.pos.get_order();
            order.take_out = this.state.take_out;
        }
    }
    TakeOutButton.template = 'TakeOutButton';
    
    ProductScreen.addControlButton({
        component: TakeOutButton,
        condition: function() {
            return this.env.pos.config.takeout_option;
        },
    });
    Registries.Component.add(TakeOutButton);

    class TagNumberButton extends PosComponent {
        setup() {
            super.setup();
            useListener('click', this.onClick);
            const order = this.env.pos.get_order();
            this.state = useState({ tag_number: order.tag_number || -1 });
        }
        async onClick() {
            const { confirmed, payload } = await this.showPopup('NumberPopup',{
                'title': 'Etiqueta',
                'startingValue': 0,
            });
            if (confirmed) {
                this.state.tag_number = parseInt(payload);
                const order = this.env.pos.get_order();
                order.tag_number = this.state.tag_number;
            }
        }
    }
    TagNumberButton.template = 'TagNumberButton';
    
    ProductScreen.addControlButton({
        component: TagNumberButton,
        condition: function() {
            return this.env.pos.config.ask_tag_number;
        },
    });
    Registries.Component.add(TagNumberButton);

    const PosGTOrder = (Order) => class PosGTOrder extends Order {
        constructor(obj, options) {
            super(...arguments);
            this.take_out = false;
        }
        export_for_printing() {
            var json = super.export_for_printing(...arguments);
            json.take_out = this.take_out;
            return json;
        }
        add_product(product, options) {
            var order = this;
            var pos = this.pos;
            var db = pos.db;
            var extras_db = this.pos.product_extras;

            async function show_extras_popup(current_list, parent_line) {
                var list = current_list.pop();
                if (list) {
                    const { confirmed, payload } = await Gui.showPopup('SelectionPopup', {
                        'title': 'Extras',
                        'list': list
                    });
                    console.log(confirmed);
                    console.log(payload);
                    if (confirmed) {
                        var extra_product = db.get_product_by_id(payload.product_id);
                        order.add_product(extra_product, { price: payload.price_extra, quantity: payload.qty, extras: { price_manually_set: true, product_extra_type: payload.type, product_extra_parent_line: parent_line } });
                        show_extras_popup(current_list, parent_line);
                    }
                }
            }

            options = options || {};
            options.merge = false;
            
            super.add_product(...arguments);
            var new_line = this.get_last_orderline();

            if (product.extras_id && product.extras_id.length > 0) {
                var extra_lists = [];
                product.extras_id.forEach(function(extra_id) {
                    var extra = extras_db[extra_id];

                    if (extra.lineas) {
                        var list = [];
                        for (const line of extra.lineas) {
                            line.type = extra.type;
                            list.push({
                                id: line.id,
                                label: line.name + " ( "+line.qty+" ) - " + pos.format_currency(line.price_extra),
                                isSelected: false,
                                item: line,
                            });
                        };
                        extra_lists.push(list);
                    }
                });

                show_extras_popup(extra_lists, new_line);
            }
        }
    }
    Registries.Model.extend(Order, PosGTOrder);

    const PosGTOrderline = (Orderline) => class PosGTOrderLine extends Orderline {
        init_from_JSON(json) {
            super.init_from_JSON(...arguments);
            this.price_manually_set = json.price_manually_set
        }
        export_as_JSON() {
            var json = super.export_as_JSON(...arguments);
            json.price_manually_set = this.price_manually_set;
            return json
        }
    }
    Registries.Model.extend(Orderline, PosGTOrderline);

    const PosGTProductScreen = (ProductScreen) => class PosGTProductScreen extends ProductScreen {
        _setValue(val) {
            var order = this.env.pos.get_order();
            if (order.get_selected_orderline()) {
                var mode = this.env.pos.numpadMode;
                if (mode === 'quantity' && ( val == '' || val == 'remove')) {
                    var line = order.get_selected_orderline();
                    if (order.get_orderlines()) {
                        
                        var to_remove = [];
                        order.get_orderlines().forEach(function(l) {
                            if (l.product_extra_parent_line && l.product_extra_parent_line.id == line.id) {
                                to_remove.push(l);
                            }
                        });
                        
                        // Si se trata de modificar la linea extra y la linea no se puede modificar
                        if (line.product_extra_type && line.product_extra_type == "fixed") {
                            this.showPopup("ErrorPopup",{
                                "title": "Parte de combo",
                                "body":  "Esta linea no se puede modificar por que es parte de un combo, solo puede borrar todo el combo borrando la linea principal.",
                            });
                            
                        // Si se trata de modificar una linea padre
                        } else if (to_remove.length > 0) {
                            to_remove.forEach(function(l) {
                                order.remove_orderline(l);
                            });
                            order.remove_orderline(line);                                
                        }
                        
                    }
                }
                
                super._setValue(val);
            }
        }
    };
    Registries.Component.extend(ProductScreen, PosGTProductScreen);

    return {
        'TakeOutButton': TakeOutButton,
        'TagNumberButton': TagNumberButton,
    }

});
