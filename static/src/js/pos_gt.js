odoo.define('pos_gt.pos_gt', function (require) {
    "use strict";

    const models = require('point_of_sale.models');
    const pos_db = require('point_of_sale.DB');
    
    const ClientListScreen = require('point_of_sale.ClientListScreen');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const PosComponent = require('point_of_sale.PosComponent');

    const Registries = require('point_of_sale.Registries');
    const { Gui } = require('point_of_sale.Gui');

    const { useListener } = require('web.custom_hooks');
    const { useState } = owl.hooks;

    models.load_models({
        model: 'account.journal',
        fields: [],
        domain: function(self){ return [['id','=',self.config.invoice_journal_id[0]]]; },
        loaded: function(self,journals){
            if (journals.length > 0) {
                self.invoice_journal = journals[0];
            }
        },
    });

    models.load_models({
        model: 'res.partner',
        fields: ['name', 'street'],
        domain: function(self){ return [['id','=',self.invoice_journal.direccion[0]]]; },
        condition: function(self){ return self.invoice_journal.direccion; },
        loaded: function(self,addresses){
            if (addresses.length > 0) {
                self.invoice_journal_address = addresses[0];
            }
        },
    });

    models.load_fields('product.product', 'extras_id');
    models.load_fields('res.partner', 'ref');
    
    models.load_models({
        model: 'pos_gt.extra',
        fields: [],
        loaded: function(self, extras){
            var extras_by_id = {};
            extras.forEach(function(e) {
                extras_by_id[e.id] = e
            })
            self.product_extras = extras_by_id;
        },
    });
    
    models.load_models({
        model: 'pos_gt.extra.line',
        fields: [],
        loaded: function(self, extra_lines){
            var extra_lines_by_id = {};
            extra_lines.forEach(function(e) {
                if (!(e.extra_id[0] in extra_lines_by_id)) {
                    extra_lines_by_id[e.extra_id[0]] = []
                }
                extra_lines_by_id[e.extra_id[0]].push(e)
            })
            self.product_extra_lines = extra_lines_by_id;
        },
    });
    
    const PosGTClientListScreen = (ClientListScreen) =>
        class extends ClientListScreen {
            activateEditMode(event) {
                super.activateEditMode(event);
                this.state.editModeProps.partner.vat = this.state.query;
            }
            async saveChanges(event) {
                if (!('vat' in event.detail.processedChanges)) {
                    event.detail.processedChanges.vat = this.state.query;
                }
                super.saveChanges(event);
            }
        };
    
    Registries.Component.extend(ClientListScreen, PosGTClientListScreen);
        
    class TakeOutButton extends PosComponent {
        constructor() {
            super(...arguments);
            useListener('click', this.onClick);
            const order = this.env.pos.get_order();
            this.state = useState({ take_out: order.take_out || false });
        }
        async onClick() {
            this.state.take_out = !this.state.take_out;
            const order = this.env.pos.get_order();
            order.take_out = this.state.take_out
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
        constructor() {
            super(...arguments);
            useListener('click', this.onClick);
            const order = this.env.pos.get_order();
            this.state = useState({ tag_number: order.tag_number || -1 });
        }
        async onClick() {
            const { confirmed, payload } = await this.showPopup('NumberPopup',{
                'title': 'Etiqueta',
                'startingValue': 1,
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

    var _super_posmodel = models.PosModel.prototype;
    models.PosModel = models.PosModel.extend({
        add_new_order: function() {
            var new_order = _super_posmodel.add_new_order.apply(this);
            if (this.config.default_client_id) {
                new_order.set_client(this.db.get_partner_by_id(this.config.default_client_id[0]))
            }
            if (this.config.invoice_journal_id) {
                new_order.set_to_invoice(true);
            }
        }
    })

    var _super_order = models.Order.prototype;
    models.Order = models.Order.extend({
        add_product: function(product, options) {
            var order = this.pos.get_order();
            var pos = this.pos;
            var db = pos.db;
            var extras_db = this.pos.product_extras;
            var extra_lines_db = this.pos.product_extra_lines;

            async function show_extras_popup(current_list, parent_line) {
                var list = current_list.pop();
                if (list) {
                    const { confirmed, payload } = await Gui.showPopup('SelectionPopup', {
                        'title': 'Extras',
                        'list': list
                    });
                    if (confirmed) {
                        var extra_product = db.get_product_by_id(payload.product_id[0]);
                        order.add_product(extra_product, { price: payload.price_extra, quantity: payload.qty, extras: { price_manually_set: true, extra_type: payload.type, parent_line: parent_line } });
                        show_extras_popup(current_list, parent_line);
                    }
                }
            }

            options = options || {};
            options.merge = false;
            
            _super_order.add_product.apply(this, [product, options]);
            var new_line = this.get_last_orderline();

            if (product.extras_id && product.extras_id.length > 0) {
                var extra_lists = [];
                product.extras_id.forEach(function(extra_id) {
                    var extra = extras_db[extra_id];
                    var extra_lines = extra_lines_db[extra_id];

                    if (extra_lines) {
                        var list = []
                        extra_lines.forEach(function(line) {
                            line.type = extra.type;
                            list.push({
                                id: line.id,
                                label: line.name + " ( "+line.qty+" ) - " + pos.format_currency(line.price_extra),
                                isSelected: false,
                                item: line,
                            });
                        })
                        extra_lists.push(list);
                    }
                })

                show_extras_popup(extra_lists, new_line);
            }
        }
    })
    
    var _super_line = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        init_from_JSON: function(json) {
            _super_line.init_from_JSON.apply(this,arguments);
            this.price_manually_set = json.price_manually_set
        },
        
        export_as_JSON: function() {
            var json = _super_line.export_as_JSON.apply(this,arguments);
            json.price_manually_set = this.price_manually_set;
            return json
        },
    })
    
    const PosGTProductScreen = (ProductScreen) =>
        class extends ProductScreen {
            _setValue(val) {
                var order = this.env.pos.get_order();
                if (order.get_selected_orderline()) {
                    var mode = this.state.numpadMode;
                    if (mode === 'quantity' && ( val == '' || val == 'remove')) {
                        var line = order.get_selected_orderline();
                        if (order.get_orderlines()) {
                            
                            var to_remove = [];
                            order.get_orderlines().forEach(function(l) {
                                if (l.parent_line && l.parent_line.id == line.id) {
                                    to_remove.push(l);
                                }
                            });
                            
                            // Si se trata de modificar la linea extra y la linea no se puede modificar
                            if (line.extra_type && line.extra_type == "fixed") {
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


});
