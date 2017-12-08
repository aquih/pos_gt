odoo.define('pos_gt.pos_gt', function (require) {
"use strict";

var screens = require('point_of_sale.screens');
var models = require('point_of_sale.models');
var pos_db = require('point_of_sale.DB');

models.load_models({
    model: 'account.journal',
    fields: [],
    domain: function(self){ return [['id','=',self.config.journal_id[0]]]; },
    loaded: function(self,journals){
        if (journals.length > 0) {
            self.sale_journal = journals[0];
        }
    },
});

models.load_models({
    model: 'res.partner',
    fields: [],
    domain: function(self){ return [['id','=',self.sale_journal.direccion[0]]]; },
    condition: function(self){ return self.sale_journal.direccion; },
    loaded: function(self,addresses){
        if (addresses.length > 0) {
            self.sale_journal_address = addresses[0];
        }
    },
});

models.load_fields('product.product','extras_id');

models.load_models({
    model: 'pos_gt.extra',
    fields: [],
    loaded: function(self,extras){
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
    loaded: function(self,extra_lines){
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

var TagNumberButton = screens.ActionButtonWidget.extend({
    template: 'TagNumberButton',
    init: function(parent, options) {
        this._super(parent, options);
        this.pos.bind('change:selectedOrder',this.renderElement,this);
    },
    button_click: function(){
        var self = this;
        var order = this.pos.get_order();
        this.gui.show_popup('number',{
            'title': 'Etiqueta',
            'value': 1,
            'confirm': function(val) {
                order.tag_number = val;
                self.renderElement();
            },
        });
    },
});

screens.define_action_button({
    'name': 'tag_number',
    'widget': TagNumberButton,
    'condition': function(){
        return this.pos.config.ask_tag_number;
    },
});

var TakeOutButton = screens.ActionButtonWidget.extend({
    template: 'TakeOutButton',
    init: function(parent, options) {
        this._super(parent, options);
        this.pos.bind('change:selectedOrder',this.renderElement,this);
    },
    button_click: function(){
        var self = this;
        var order = this.pos.get_order();
        order.take_out = !order.take_out;
        this.renderElement();
    },
});

screens.define_action_button({
    'name': 'take_out',
    'widget': TakeOutButton,
    'condition': function(){
        return this.pos.config.takeout_option;
    },
});

screens.ClientListScreenWidget.include({
    display_client_details: function(visibility,partner,clickpos){
        this._super(visibility,partner,clickpos);
        if (visibility === 'edit') {
            var vat = this.$('.screen-content input').val();
            if (this.$('.vat').val().trim() == '') {
                this.$('.vat').val(vat);
            }
        };
    }
})

screens.PaymentScreenWidget.include({
    show: function(){
        if (!this.pos.get_order().is_to_invoice()) {
            this.click_invoice();
        }
        this._super();
    }
})

var _super_posmodel = models.PosModel.prototype;
models.PosModel = models.PosModel.extend({
    add_new_order: function(){
        var new_order = _super_posmodel.add_new_order.apply(this);
        if (this.config.default_client_id) {
            new_order.set_client(this.db.get_partner_by_id(this.config.default_client_id[0]))
        }
    }
})

var _super_order = models.Order.prototype;
models.Order = models.Order.extend({
    add_product: function(product, options){
        _super_order.add_product.apply(this,arguments);

        var new_line = this.get_last_orderline();
        var order = this.pos.get_order();
        var db = this.pos.db;
        var gui = this.pos.gui;
        var extras_db = this.pos.product_extras;
        var extra_lines_db = this.pos.product_extra_lines;
        if (product.extras_id && product.extras_id.length > 0) {

            var list = [];
            product.extras_id.forEach(function(extra_id) {
                var extra = extras_db[extra_id];
                var extra_lines = extra_lines_db[extra_id];

                if (extra_lines) {
                    extra_lines.forEach(function(line) {
                        line.type = extra.type;
                        list.push({
                            label: line.name + " ( "+line.qty+" )",
                            item: line,
                        });
                    })
                }
            })

            gui.show_popup('selection', {
                'title': 'Por favor seleccione',
                'list': list,
                'confirm': function(line) {
                    var extra_product = db.get_product_by_id(line.product_id[0]);
                    order.add_product(extra_product, { price: line.price_extra, quantity: line.qty, extras: { extra_type: line.type, parent_line: new_line} });
                    if (product.extras_id.length == 1) {
                        gui.close_popup();
                    }
                },
            });
        }
    }
})

var _super_line = models.Orderline.prototype;
models.Orderline = models.Orderline.extend({
    set_quantity: function(quantity){
        var line = this;
        var order = this.pos.get_order();

        // Si se trata de modificar la linea extra y esta no se puede modificar
        if (line.extra_type && line.extra_type == "fixed") {

            this.pos.gui.show_popup("error",{
                "title": "Parte de combo",
                "body":  "Esta linea no se puede modificar por que es parte de un combo, solo se puede borrar todo el combo borrando la linea principal.",
            });

        } else {

            var to_remove = [];
            order.get_orderlines().forEach(function(l) {
                if (l.parent_line && l.parent_line.id == line.id) {
                    to_remove.push(l);
                }
            });

            // Si se trata de modificar una linea padre, se borra.
            if (to_remove.length > 0) {
                to_remove.forEach(function(l) {
                    order.remove_orderline(l);
                });
                order.remove_orderline(line);
            } else {
                _super_line.set_quantity.apply(this,arguments);
            }
        }
    }
})

pos_db.include({
    _partner_search_string: function(partner){
        var str =  partner.name;
        if(partner.ean13){
            str += '|' + partner.ean13;
        }
        if(partner.address){
            str += '|' + partner.address;
        }
        if(partner.phone){
            str += '|' + partner.phone.split(' ').join('');
        }
        if(partner.mobile){
            str += '|' + partner.mobile.split(' ').join('');
        }
        if(partner.email){
            str += '|' + partner.email;
        }
        if(partner.vat){
            str += '|' + partner.vat;
        }
        str = '' + partner.id + ':' + str.replace(':','') + '\n';
        return str;
    }
})

});
