odoo.define('pos_gt.pos_gt', function (require) {
"use strict";

var screens = require('point_of_sale.screens');
var models = require('point_of_sale.models');
var pos_db = require('point_of_sale.DB');

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

screens.ClientListScreenWidget.include({
    display_client_details: function(visibility,partner,clickpos){
        this._super(visibility,partner,clickpos);
        if (visibility === 'edit') {
            var vat = this.$('.screen-content input').val();
            this.$('.vat').val(vat);
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
        var new_product = _super_order.add_product.apply(this,arguments);
        var order  = this.pos.get_order();
        var db = this.pos.db;
        var gui = this.pos.gui;
        var extras_db = this.pos.product_extras;
        var extra_lines_db = this.pos.product_extra_lines;
        if (product.extras_id && product.extras_id.length > 0) {
            product.extras_id.forEach(function(extra_id) {
                var extra = extras_db[extra_id];
                var extra_lines = extra_lines_db[extra_id];

                var list = [];
                if (extra_lines) {
                    extra_lines.forEach(function(line) {
                        list.push({
                            label: line.product_id[1],
                            item: line,
                        });
                    })
                }

                gui.show_popup('selection',{
                    'title': 'Por favor seleccione',
                    'list': list,
                    'confirm': function(line){
                        var extra_product = db.get_product_by_id(line.product_id[0]);
                        var qty = 1;

                        if (extra.operation == 'remove') {
                            qty = -1
                        }
                        order.add_product(extra_product, {price: line.price_extra, quantity: qty});

                        if (extra.type == 'one') {
                            gui.close_popup();
                        }
                    },
                });
            })
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
