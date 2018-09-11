odoo.define('pos_gt.pos_gt', function (require) {
"use strict";

var screens = require('point_of_sale.screens');
var models = require('point_of_sale.models');
var pos_db = require('point_of_sale.DB');
var core = require('web.core');
var gui = require('point_of_sale.gui');
var Model = require('web.DataModel');
var _t = core._t;

var orden_id_cargada = 0;
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

var RecetasButton = screens.ActionButtonWidget.extend({
    template: 'RecetasButton',
    init: function(parent, options) {
        this._super(parent, options);
        this.pos.bind('change:selectedOrder',this.renderElement,this);
    },
    button_click: function(){
        var self = this;
        var order = this.pos.get_order();
        var Producto = new Model('product.template');
        var Receta = new Model('mrp.bom');
        var producto = order.get_selected_orderline().product.product_tmpl_id;
        Receta.query(['id','product_tmpl_id','code'])
         .filter([['product_tmpl_id', '=', producto]])
         .limit(1000)
         .all().then(function (receta) {
            if(receta.length > 0){
                var ProductosRecetas = new Model('mrp.bom.line');
                ProductosRecetas.query(['id','product_id','product_uom_id','product_qty'])
                     .filter([['bom_id', '=', receta[0].id]])
                     .limit(1000)
                     .all().then(function (receta) {
                        for (var i=0; i < receta.length; i++){
                            receta[i]['label'] = receta[i].product_id[1] +' '+ 'Cantidad: '+receta[i].product_qty+ ' ' +receta[i].product_uom_id[1]   
                            receta[i]['item'] = receta[i].id
                        }
                        self.mostrar_receta(receta);
                });
            }

        });
        order.recetas = !order.recetas;
        this.renderElement();
    },

    mostrar_receta: function(productos){
        var self = this;
        var order = this.pos.get_order();
        var producto = order.get_selected_orderline().product.display_name;
        this.gui.show_popup('selection', {
            'title': producto + ' Receta Unitaria',
            'list': productos,
            'confirm': function(producto) {
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

        if (line && order) {

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
        } else {
            _super_line.set_quantity.apply(this,arguments);
        }
    }
})
///////////////////////////////////////////////////////

var SaveOrderButton = screens.ActionButtonWidget.extend({
    template: 'SaveOrderButton',
    init: function(parent, options) {
        this._super(parent, options);
        this.pos.bind('change:selectedOrder',this.renderElement,this);
    },
    button_click: function(){
        var self = this;
        var order = this.pos.get_order();
        var restaurante = this.pos.config.floor_ids && this.pos.config.floor_ids.length > 0;
        if (order.get_order_id() == 0 || order.get_order_id() == null ){
            // order.pos_session_id = this.pos.config.session_save_order[0]
            // this.pos.push_order(order);
            var orderlines = []
            for(var i = 0; i < order.orderlines.models.length; i++){
                // var tax = []
                // tax.push((,order.orderlines.models[i].product.taxes_id[0]))
                orderlines.push({
                    'order_id':0,
                    'product_id': order.orderlines.models[i].product.id,
                    'qty': order.orderlines.models[i].quantity,
                    'discount': order.orderlines.models[i].discount,
                    'price_unit': order.orderlines.models[i].price
                    // 'tax_ids': tax
                })
            }
            var orden;
            if(restaurante > 0){
                orden = {
                    'partner_id': order.get_client().id,
                    'session_id': this.pos.config.session_save_order[0],
                    'user_id': this.pos.get_cashier().id,
                    'customer_count': order.get_customer_count(),
                    'table_id': order.table.id
                }
            }else{
                orden = {
                    'partner_id': order.get_client().id,
                    'session_id': this.pos.config.session_save_order[0],
                    'user_id': this.pos.get_cashier().id
                }
            }
            new Model("pos.order").call("guardar_pedido_session_alterna",[[],orden,orderlines]).then(function(order_name){

                self.gui.show_popup('confirm', {
                    'title': 'Pedido guardado No.',
                    'body': order_name,
                    'confirm': function(line) {
                    },
                });


                // console.log(result);//show result in console

            });
        }else{

            var orden;
            if (restaurante > 0){
                orden = {
                    'partner_id': order.get_client().id,
                    'user_id': this.pos.get_cashier().id,
                    'customer_count': order.get_customer_count()
                }
            }else{
                orden = {
                    'partner_id': order.get_client().id,
                    'user_id': this.pos.get_cashier().id
                }                
            }

            var order_id = order.attributes.order_id;
            // order.change.order_id = order_id
            // order.pos_session_id = this.pos.config.session_save_order[0]
            // order.attributes.order_id = order_id
            // this.pos.push_order(order);
            var order_id = order.attributes.order_id;
            var orderlines = []
            for(var i = 0; i < order.orderlines.models.length; i++){
                orderlines.push({
                    'order_id':0,
                    'product_id': order.orderlines.models[i].product.id,
                    'qty': order.orderlines.models[i].quantity,
                    'discount': order.orderlines.models[i].discount,
                    'price_unit': order.orderlines.models[i].price
                })
            }
            new Model("pos.order").call("actualizar_pedido",[[],order_id,orden,orderlines,restaurante]).then(function(result){

                // console.log(result);//show result in console

            });
        }
        // this.pos.push_order(order);
        this.pos.delete_current_order();
        order.save_order = !order.save_order;
        this.renderElement();
    },
});

screens.define_action_button({
    'name': 'save_order',
    'widget': SaveOrderButton,
    'condition': function(){
        return this.pos.config.save_order_option;
        
    },
});


var LoadOrderButton = screens.ActionButtonWidget.extend({
    template: 'LoadOrderButton',
    init: function(parent, options) {
        this._super(parent, options);
        this.pos.bind('change:selectedOrder',this.renderElement,this);
    },
    button_click: function(){
        var self = this;
        this.gui.show_popup('textinput',{
            'title': _t('Ingrese referencia de orden'),
            'confirm': function(val) {
                var pedidos_usuario = this.pos.config.opcion_pedidos_vendedor;
                var restaurante = this.pos.config.floor_ids && this.pos.config.floor_ids.length > 0;
                var condiciones = [];
                if ( pedidos_usuario == true){
                    condiciones = [['state', '=', 'draft'], ['name', 'ilike', val],['user_id','=',this.pos.get_cashier().id]]
                }else{
                    condiciones = [['state', '=', 'draft'], ['name', 'ilike', val]]
                }
                var Orders = new Model('pos.order');
                if (restaurante > 0){
                    Orders.query(['name', 'state','partner_id','table_id'])
                         .filter(condiciones)
                         .limit(15)
                         .all().then(function (orders) {
                            var orders_list = [];
                            var i=0;
                            for(i = 0; i < orders.length; i++){
                                orders_list.push({'label': orders[i]['name'] +', Mesa: '+orders[i]['table_id'][1]+', Cliente: '+orders[i]['partner_id'][1] ,'item':orders[i]['id'],}); 
                            }
                            self.select_order(orders_list);
                    });
                }else{
                    Orders.query(['name', 'state','partner_id'])
                         .filter(condiciones)
                         .limit(15)
                         .all().then(function (orders) {
                            var orders_list = [];
                            var i=0;
                            for(i = 0; i < orders.length; i++){
                                orders_list.push({'label': orders[i]['name'],'item':orders[i]['id'],}); 
                            }
                            self.select_order(orders_list);
                    });

                }


            },
        });
    },
    select_order: function(order){
        var self = this;
        var orden = this.pos.get_order();
        var db = this.pos.db;
        var restaurante = this.pos.config.floor_ids && this.pos.config.floor_ids.length > 0;
        // var order = this.pos.get_order();
        this.gui.show_popup('selection', {
            'title': 'Por favor seleccione',
            'list': order,
            'confirm': function(line) {
                //line devuelve el id de la orden
                orden_id_cargada = line
                var OrdersLine = new Model('pos.order.line');
                var Order = new Model('pos.order');
                var Product = new Model('product.product');
                var cliente;
                var producto_id = 0;
                var precio_unitario=0;
                var cantidad=0;

                if (restaurante > 0){
                    Order.query(['id','user_id','partner_id','table_id','customer_count'])
                     .filter([['id', '=', line]])
                     .limit(15)
                     .all().then(function (partner) {
                        cliente = partner
                        orden_id_cargada = partner[0].id;
                        orden.set_customer_count(partner[0].customer_count);
                        self.pos.set_cashier({'id': partner[0].user_id[0]});
                        OrdersLine.query(['id', 'create_uid','name','order_id','price_unit','qty','product_id','discount'])
                         .filter([['order_id', 'like', line]])
                         .limit(15)
                         .all().then(function (orderslines) {
                            self.agregar_orden(partner, partner[0].id,orderslines);
                        });
                    });
                }else{
                    Order.query(['id','user_id','partner_id'])
                     .filter([['id', '=', line]])
                     .limit(15)
                     .all().then(function (partner) {
                        cliente = partner
                        orden_id_cargada = partner[0]['id'];

                        OrdersLine.query(['id', 'create_uid','name','order_id','price_unit','qty','product_id','discount'])
                         .filter([['order_id', 'like', line]])
                         .limit(15)
                         .all().then(function (orderslines) {
                            var lista=[]
                            var precio_venta = [];
                            var cantidad_vendida = [];
                            var val = 0;
                            var producto_id;
                            for (var i=0; i< orderslines.length; i++){

                                lista.push({'product_id':orderslines[i]['product_id'][0],'qty':orderslines[i]['qty'],});
                                producto_id = orderslines[i]['product_id'][0];
                                var cantidad;
                                var producto = db.get_product_by_id(orderslines[i]['product_id'][0])
                                cantidad = orderslines[i]['qty'];
                                orden.add_product(producto,{quantity: cantidad});
                                orden.set_order_id(orden_id_cargada);
                            }
                            self.pos.set_cashier({'id': cliente[0].user_id[0]});
                            orden.set_client(db.get_partner_by_id(cliente[0]['partner_id'][0]));
                        });
                    });
                }
            },
        });
    },

    agregar_orden: function(order,order_id,orderslines){
        var self = this;
        var db = this.pos.db;
        var Restaurant = new Model('restaurant.table');
        var RestaurantFloor = new Model('restaurant.floor');
        Restaurant.query(['color','floor_id','height','id','name','position_h','position_v','seats','shape','width'])
         .filter([['id','=',order[0].table_id[0]]])
         .limit(15)
         .all().then(function (result) {

            RestaurantFloor.query(['id','name','sequence'])
             .filter([['id','=',result[0].floor_id[0]]])
             .limit(15)
             .all().then(function (floor) {
                var producto_id;
                var cantidad;
                result[0].floor= floor[0];
                self.pos.set_table(result[0]);
                var orden = self.pos.get_order();
                orden.set_customer_count(order[0].customer_count);
                self.pos.set_cashier({'id': order[0].user_id[0]});
                orden.set_client(db.get_partner_by_id(order[0]['partner_id'][0]));
                self.pos.set_order(orden);
                for (var i=0; i< orderslines.length; i++){
                    producto_id = orderslines[i]['product_id'][0];
                    cantidad = orderslines[i]['qty'];
                    var producto = db.get_product_by_id(producto_id)
                    orden.add_product(producto,{quantity: cantidad});
                    orden.set_order_id(orden_id_cargada);
                }

            });
        });

    }
});

screens.define_action_button({
    'name': 'load_order',
    'widget': LoadOrderButton,
    'condition': function(){
        return this.pos.config.load_order_option;
    },
});


var LoadOrderSessionButton = screens.ActionButtonWidget.extend({
    template: 'LoadOrderSessionButton',
    init: function(parent, options) {
        this._super(parent, options);
        this.pos.bind('change:selectedOrder',this.renderElement,this);
    },
    button_click: function(){
        var self = this;
        var order = this.pos.get_order();
        var gui = this.pos.gui;
    
        gui.show_popup('textinput',{
            'title': 'Ingrese sesión',
            'confirm': function(val) {
                var Session = new Model('pos.session');
                Session.query(['name', 'state'])
                 .filter([['state', '=', 'opened'], ['name', 'ilike', val]])
                 .limit(15)
                 .all().then(function (sessions) {
                    var sessions_list = [];
                    var i=0;
                    for(i = 0; i < sessions.length; i++){
                        sessions_list.push({'label': sessions[i]['name'],'item':sessions[i]['id'],}); 
                    }
                    self.select_session(sessions_list);

                });
            },
        });
    },
    select_session: function(sessions_list){
        var self = this;
        // var orden = this.pos.get_order();
        var gui = this.pos.gui;
        var db = this.pos.db;
        var ordenes =[];
        var restaurante = this.pos.config.floor_ids && this.pos.config.floor_ids.length > 0;
        var i;
        var lineas_orden = [];
        gui.show_popup('selection',{
            'title': 'Por favor seleccione',
            'list': sessions_list,
            'confirm': function(session_id) {
                var cliente;
                var producto_id = 0;
                var precio_unitario=0;
                var cantidad=0;
                var Order = new Model('pos.order');
                if (restaurante > 0){
                    Order.query(['id','partner_id','user_id','table_id','customer_count'])
                     .filter([['session_id', '=', session_id],['state','=','draft']])
                     .limit(15)
                     .all().then(function (order) {
                        var precio_venta = [];
                        var cantidad_vendida = [];
                        var precio_unitario =0;
                        var cantidad =0;
                        var posicion_orden =0; 
                        for (i=0; i < order.length; i++){
                            var a = i;
                            ordenes.push(order);
                            var Orderline = new Model('pos.order.line');
                            Orderline.query(['order_id','product_id','qty','discount','price_unit'])
                             .filter([['order_id', '=', order[i].id]])
                             .limit(15)
                             .all().then(function (orderslines) {
                                for (var a= 0; a < order.length; a++){
                                    if (order[a].id == orderslines[0].order_id[0]){
                                        self.agregar_orden(order,orderslines,a);
                                    }
                                }

                            });
                        }
                        location.reload();

                    });
                }else{
                    var Order = new Model('pos.order');
                    Order.query(['id','partner_id','user_id'])
                     .filter([['session_id', '=', session_id],['state','=','draft']])
                     .limit(15)
                     .all().then(function (order) {
                            var i;
                            for (i=0; i < order.length; i++){
                                ordenes.push(order);
                                var Orderlines = new Model('pos.order.line');
                                Orderlines.query(['order_id','product_id','qty','discount','price_unit'])
                                 .filter([['order_id', '=', order[i].id]])
                                 .limit(15)
                                 .all().then(function (orderslines) {
                                    for(var a=0; a < order.length; a++){
                                        if (order[a].id == orderslines[0].order_id[0] ){
                                            self.pos.add_new_order();
                                            orden_id_cargada = order[a].id;
                                            var orden = self.pos.get_order();
                                            orden.set_order_id(orden_id_cargada);
                                            var producto_id;
                                            var cantidad;
                                            orden.set_client(db.get_partner_by_id(order[a]['partner_id'][0]));
                                            self.pos.set_cashier({'id': order[a].user_id[0]});
                                            for (var i=0; i< orderslines.length; i++){
                                                producto_id = orderslines[i]['product_id'][0];
                                                cantidad = orderslines[i]['qty'];
                                                var producto = db.get_product_by_id(producto_id)
                                                orden.add_product(producto,{quantity: cantidad});
                                                orden.set_order_id(orden_id_cargada);
                                            }
                                        }
                                    }
                                });


                            }
                    });
                }
            },
        });

    },
    agregar_orden: function(order,orderslines,a){
        var self = this;
        var db = this.pos.db;

        var Restaurant = new Model('restaurant.table');
        Restaurant.query(['color','floor_id','height','id','name','position_h','position_v','seats','shape','width'])
         .filter([['id','=',order[a].table_id[0]]])
         .limit(15)
         .all().then(function (result) {

            var RestaurantFloor = new Model('restaurant.floor');
            RestaurantFloor.query(['id','name','sequence'])
             .filter([['id','=',result[0].floor_id[0]]])
             .limit(15)
             .all().then(function (floor) {
                var es_cargada = 1;
                var producto_id;
                var cantidad;
                var orden_id_cargada = order[a].id
                result[0].floor= floor[0];
                self.pos.set_table(result[0]);
                var orden = self.pos.get_order();
                orden.set_customer_count(order[a].customer_count);
                self.pos.set_cashier({'id': order[a].user_id[0]});
                orden.set_client(db.get_partner_by_id(order[a]['partner_id'][0]));
                self.pos.set_order(orden);
                orden.set_order_id(orden_id_cargada);
                orden.orden_id_cargada = orden_id_cargada
                for (var i=0; i< orderslines.length; i++){
                    producto_id = orderslines[i]['product_id'][0];
                    cantidad = orderslines[i]['qty'];
                    var producto = db.get_product_by_id(producto_id)
                    producto.qty = cantidad;
                    orden.add_product(producto,{quantity: cantidad});
                    
                }
            });

        });

        new Model("pos.order").call("unlink_order",[[],order[a].id]).then(function(result){

        });
    }

});

screens.define_action_button({
    'name': 'load_order_session',
    'widget': LoadOrderSessionButton,
    'condition': function(){
        return this.pos.config.load_order_session_option;
    },
});

models.PosModel = models.PosModel.extend({
    push_and_invoice_order: function(order){
        var self = this;
        var invoiced = new $.Deferred(); 
        var orden = self.get_order();
        if(!order.get_client()){
            invoiced.reject({code:400, message:'Missing Customer', data:{}});
            return invoiced;
        }
        var order_id = this.db.add_order(order.export_as_JSON());
        this.flush_mutex.exec(function(){
            var done = new $.Deferred(); // holds the mutex

            // send the order to the server
            // we have a 30 seconds timeout on this push.
            // FIXME: if the server takes more than 30 seconds to accept the order,
            // the client will believe it wasn't successfully sent, and very bad
            // things will happen as a duplicate will be sent next time
            // so we must make sure the server detects and ignores duplicated orders

            var transfer = self._flush_orders([self.db.get_order(order_id)], {timeout:30000, to_invoice:true});
            transfer.fail(function(error){
                invoiced.reject(error);
                done.reject();
            });
            var orderModel = new Model('pos.order');
            orderModel.call('unlink', [orden.get_order_id()]).then(function (result) {
            });

            // on success, get the order id generated by the server
            transfer.pipe(function(order_server_id){  
                // generate the pdf and download it
                self.chrome.do_action('point_of_sale.pos_invoice_report',{additional_context:{ 
                    active_ids:order_server_id,
                }}).done(function () {
                    invoiced.resolve();
                    done.resolve();
                });

            });

            return done;

        });

        return invoiced;
    },


});


models.Order = models.Order.extend({

    set_order_id: function(id) {
        this.set({
            order_id: id,
        });
    },

    get_order_id: function() {
        return this.get('order_id');
    },

    set_order_lines: function(orderlines){
        this.set({
            order_lines: orderlines,
        });
    },

    get_order_lines: function(){
        return this.get('order_lines')
    },

    set_state_order:function(state){
        this.set({
            state_order: state,
        });
    },

    get_state_order: function() {
        return this.get('state_order');
    },

    set_name_order:function(name){
        this.set({
            name_order: name,
        });
    },

    get_name_order: function() {
        return this.get('name_order');
    },    

    set_pos_reference:function(reference){
        this.set({
            pos_reference: reference,
        });
    },
    get_pos_reference: function() {
        return this.get('pos_reference');
    },    

});



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
