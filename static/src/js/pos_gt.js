odoo.define('pos_gt.pos_gt', function (require) {
"use strict";

var screens = require('point_of_sale.screens');
var models = require('point_of_sale.models');
var pos_db = require('point_of_sale.DB');
var rpc = require('web.rpc');
var gui = require('point_of_sale.gui');
var core = require('web.core');
var PopupWidget = require('point_of_sale.popups');
var field_utils = require('web.field_utils');
var QWeb = core.qweb;
var _t = core._t;

models.load_models({
    model: 'account.journal',
    fields: [],
    domain: function(self){ return [['id','=',self.config.invoice_journal_id[0]]]; },
    loaded: function(self,journals){
        if (journals.length > 0) {
            self.sale_journal = journals[0];
        }
    },
});

models.load_models({
    model: 'res.partner',
    fields: ['name', 'street'],
    domain: function(self){ return [['id','=',self.sale_journal.direccion[0]]]; },
    condition: function(self){ return self.sale_journal.direccion; },
    loaded: function(self,addresses){
        if (addresses.length > 0) {
            self.sale_journal_address = addresses[0];
        }
    },
});

models.load_models({
    model: 'hr.employee',
    fields: ['id','name','clave_empleado','codigo_empleado'],
    domain: function(self){ return [['company_id','=',self.company && self.company.id]]},
    loaded: function(self,empleados){
        self.empleado = empleados[0]
        self.empleados = empleados;
    },
});

models.load_fields('product.product','extras_id');
models.load_fields('res.partner','ref');

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
    show: function(){
        var self = this;
        var nit = '';
        this._super();
        this.$('.new-customer').click(function(){
            nit = self.$('.searchbox input')[0].value
            self.display_client_details('edit',{
                'vat': nit,
            });
        });
    },
});

screens.ProductCategoriesWidget.include({
    set_category : function(category) {
        var db = this.pos.db;
        if (!category) {
            category = db.get_category_by_id(this.start_categ_id);
        }
        this._super(category);
    }
})

var PassInputPopupWidget = PopupWidget.extend({
    template: 'PassInputPopupWidget',
    show: function(options){
        options = options || {};
        this._super(options);

        this.renderElement();
        this.$('input,textarea').focus();
    },
    click_confirm: function(){
        var value = this.$('input,textarea').val();
        this.gui.close_popup();
        if( this.options.confirm ){
            this.options.confirm.call(this,value);
        }
    },
});
gui.define_popup({name:'passinput', widget: PassInputPopupWidget});

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


var RecetasButton = screens.ActionButtonWidget.extend({
    template: 'RecetasButton',
    init: function(parent, options) {
        this._super(parent, options);
        this.pos.bind('change:selectedOrder',this.renderElement,this);
    },
    button_click: function(){
        var self = this;
        var order = this.pos.get_order();
        var gui = this.pos.gui;
        var producto = order.get_selected_orderline().product.product_tmpl_id;
        rpc.query({
                model: 'mrp.bom',
                method: 'search_read',
                args: [[['product_tmpl_id', '=', producto]] , ['id','product_tmpl_id','code']],
            })
            .then(function (receta){
                if(receta.length > 0){
                    rpc.query({
                            model: 'mrp.bom.line',
                            method: 'search_read',
                            args: [[['bom_id', '=', receta[0].id]] , ['id','product_id','product_uom_id','product_qty']],
                        })
                        .then(function (productos){
                            for (var i=0; i < productos.length; i++){
                                productos[i]['label'] = productos[i].product_id[1] +' '+ 'Cantidad: '+productos[i].product_qty+ ' ' +productos[i].product_uom_id[1]
                                productos[i]['item'] = productos[i].id
                            }
                            self.mostrar_receta(productos);

                        });
                }
            });
        order.recetas = !order.recetas;
        this.renderElement();
    },
    mostrar_receta: function(productos){
        var self = this;
        var gui = this.pos.gui;
        var order = this.pos.get_order();
        var producto = order.get_selected_orderline().product.display_name;
        this.gui.show_popup('selection',{
            'title': producto + ' Receta Unitaria',
            'list': productos,
            'confirm': function(val) {
            },
        });
    },
});

screens.define_action_button({
    'name': 'recetas',
    'widget': RecetasButton,
    'condition': function(){
        return this.pos.config.opcion_recetas;
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
    export_as_JSON: function() {
        var json = _super_order.export_as_JSON.apply(this,arguments);
        if (this.pos.get_empleado()) {
            json.employee_id = this.pos.get_empleado().id;
        }
        return json;
    },
    export_for_printing: function() {
        var json = _super_order.export_for_printing.apply(this,arguments);
        json.employee = this.pos.get_empleado();
        return json;
    },
    add_product: function(product, options) {
        options = options || {};

        function show_extras_popup(current_list) {

            if (gui.has_popup()) {
                setTimeout(function(){
                    show_extras_popup(current_list)
                }, 800)
                return;
            }

            var list = current_list.pop();
            if (list) {
                gui.show_popup('selection', {
                    'title': 'Extras',
                    'list': list,
                    'confirm': function(line) {
                        var extra_product = db.get_product_by_id(line.product_id[0]);
                        extra_product.lst_price = line.price_extra;
                        order.add_product(extra_product, { price: line.price_extra, quantity: line.qty, extras: { price_manually_set: true, extra_type: line.type, parent_line: new_line} });
                        show_extras_popup(current_list);
                    },
                    'cancel': function(line) {
                        show_extras_popup(current_list);
                    },
                });
            }
        }

        options.merge = false;
        _super_order.add_product.apply(this, [product, options]);

        var new_line = this.get_last_orderline();
        var order = this.pos.get_order();
        var db = this.pos.db;
        var gui = this.pos.gui;
        var chrome = this.pos.chrome;
        var extras_db = this.pos.product_extras;
        var extra_lines_db = this.pos.product_extra_lines;

        if (options.cargar_extras || options.cargar_extras == null) {
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
                                label: line.name + " ( "+line.qty+" ) - " + chrome.format_currency(line.price_extra),
                                item: line,
                            });
                        })
                        extra_lists.push(list);
                    }
                })

                show_extras_popup(extra_lists);
            }
        }
    }
})

var _super_line = models.Orderline.prototype;
models.Orderline = models.Orderline.extend({

    init_from_JSON: function(json) {
        _super_line.init_from_JSON.apply(this,arguments);
        this.price_manually_set = json.price_manually_set
    },

    set_quantity: function(quantity){
        var line = this;
        var order = this.pos.get_order();

        if (line && order && order.get_orderlines()) {

            var to_remove = [];
            order.get_orderlines().forEach(function(l) {
                if (l.parent_line && l.parent_line.id == line.id) {
                    to_remove.push(l);
                }
            });

            // Si se trata de modificar la linea extra y esta no se puede modificar
            if (line.extra_type && line.extra_type == "fixed" && to_remove.length <= 0) {

                this.pos.gui.show_popup("error",{
                    "title": "Parte de combo",
                    "body":  "Esta linea no se puede modificar por que es parte de un combo, solo se puede borrar todo el combo borrando la linea principal.",
                });

            } else {

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
        } else {
            _super_line.set_quantity.apply(this,arguments);
        }
    },
    export_as_JSON: function() {
        var json = _super_line.export_as_JSON.apply(this,arguments);
        json.price_manually_set = this.price_manually_set;
        return json
    },
})

var DosPorUnoButton = screens.ActionButtonWidget.extend({
    template: 'DosPorUnoButton',
    init: function(parent, options) {
        this._super(parent, options);
        this.pos.bind('change:selectedOrder',this.renderElement,this);
    },
    button_click: function(){
        var self = this;
        var order = this.pos.get_order();
        var cantidad_productos_linea = 0;
        var productos = [];
        var productos_promocion = this.pos.config.productos_ids;

        order.get_orderlines().forEach(function (orderline) {
            if (orderline.quantity > 1){
                if (productos_promocion.length > 0){
                    for ( var i=0; i < productos_promocion; i++){
                        if (productos_promocion[i] == orderline.get_product().id){
                            for (i = 0; i < orderline.quantity; i++){
                                order.add_product( orderline.get_product(),{quantity: 1});
                            }
                            order.remove_orderline(orderline);
                        }
                    }
                }
            }
        });

        order.get_orderlines().forEach(function (orderline) {
            if (orderline.quantity == 1){
                if(productos_promocion.length > 0){
                    for (var j=0; j < productos_promocion.length; j++){
                        if (productos_promocion[j] == orderline.product.id){
                            productos.push({'linea': orderline,'price': orderline.price,'quantity': orderline.quantity})
                            cantidad_productos_linea += orderline.quantity

                        }
                    }
                }else{
                    productos.push({'linea': orderline,'price': orderline.price,'quantity': orderline.quantity})
                    cantidad_productos_linea += orderline.quantity
                }
            }
        });
        if (productos.length > 0){
            self.dos_por_uno_linea(cantidad_productos_linea,productos);
        }
        order.dos_por_uno = !order.dos_por_uno;
        this.renderElement();
    },
    dos_por_uno_linea:function(cantidad_productos_linea,productos){
      if (cantidad_productos_linea % 2 == 0){
          productos.sort(function(a,b){
              return b['price'] - a['price']
          })
          var i;
          for (i = cantidad_productos_linea/2 ; i < productos.length; i++) {
              productos[i].linea.set_unit_price(0);
              productos[i].linea.price_manually_set = true
          }
      }else{
          productos.sort(function(a,b){
              return a['price'] - b['price']
          })
          var i;
          for (i=0; i< ((cantidad_productos_linea - 1 )/ 2) ; i++){
              productos[i].linea.set_unit_price(0);
          }
      }

    },

});

screens.define_action_button({
    'name': 'dos_por_uno',
    'widget': DosPorUnoButton,
    'condition': function(){
        return this.pos.config.opcion_dos_por_uno;
    },
});

var EmpleadoWidget = screens.ActionButtonWidget.extend({
    template: 'EmpleadoWidget',
    init: function(parent, options) {
        this._super(parent, options);
        this.pos.bind('change:selectedOrder',this.renderElement,this);
    },
    button_click: function(){
        var self = this;
        var order = this.pos.get_order();
        var list = [];
        for (var i = 0; i < this.pos.empleados.length; i++) {
            var empleado = this.pos.empleados[i];
            list.push({
                'label': empleado.name,
                'item':  empleado,
            });
        }

        if (this.pos.config.filtro_empleado){
            this.gui.show_popup('textinput',{
                'title': 'Seleccione empleado',
                'confirm': function(filtro) {
                    var lista_empleados = []
                    for (var i=0; i < list.length; i++){

                        if (list[i]['item']['codigo_empleado'] != false){
                            if (list[i]['item']['codigo_empleado'].toLowerCase().includes(filtro) || list[i]['item']['name'].toLowerCase().includes(filtro)  ){
                                lista_empleados.push(list[i]);
                            }
                        }else{
                            if ( list[i]['item']['name'].toLowerCase().includes(filtro)){
                                lista_empleados.push(list[i]);
                            }
                        }
                    }
                    this.gui.show_popup('selection',{
                        'title': 'Seleccione empleado',
                        'list': lista_empleados,
                        'confirm': function(empleado) {
                            if(empleado['clave_empleado'].length > 0){
                                self.gui.show_popup('passinput',{
                                    'title': 'Ingrese clave',
                                    'confirm': function(clave_empleado) {
                                        if (clave_empleado == empleado['clave_empleado']){
                                            self.pos.set_empleado(empleado);
                                            self.renderElement();
                                        }else{
                                            self.renderElement();
                                        }
                                    },
                                });
                            }else{
                                self.pos.set_empleado(empleado);
                                self.renderElement();
                            }


                        },
                    });

                },
            });
        }else{
            this.gui.show_popup('selection',{
                'title': 'Seleccione empleado',
                'list': list,
                'confirm': function(empleado) {
                    if(empleado['clave_empleado'].length > 0){
                        self.gui.show_popup('passinput',{
                            'title': 'Ingrese clave',
                            'confirm': function(clave_empleado) {
                                if (clave_empleado == empleado['clave_empleado']){
                                    self.pos.set_empleado(empleado);
                                    self.renderElement();
                                }else{
                                    self.renderElement();
                                }
                            },
                        });
                    }else{
                        self.pos.set_empleado(empleado);
                        self.renderElement();
                    }
                },
            });
        }

    },
    get_name: function(){
        var empleado = this.pos.get_empleado();
        if(empleado){
            return empleado.name;
        }else{
            return "";
        }
    },
});

screens.define_action_button({
    'name': 'empleanombre',
    'widget': EmpleadoWidget,
    'condition': function(){
        return this.pos.config.opcion_empleado;
    },
});

models.PosModel = models.PosModel.extend({
    get_empleado: function(){
        return this.get('empleado')|| this.db.get_empleado() || this.empleado;
    },
    set_empleado: function(empleado){
        this.set('empleado', empleado);
        this.db.set_empleado(this.empleado);
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
        if(partner.ref){
            str += '|' + partner.ref;
        }
        str = '' + partner.id + ':' + str.replace(':','') + '\n';
        return str;
    },
    set_empleado: function(empleado) {
        this.save( 'empleado', empleado || null);
    },
    get_empleado: function() {
        return this.load('empleado');
    }
})

return {
    EmpleadoWidget: EmpleadoWidget,
};

});
