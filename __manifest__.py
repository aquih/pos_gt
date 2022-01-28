
# -*- coding: utf-8 -*-

{
    'name': 'Point of Sale para Guatemala',
    'version': '3.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'summary': 'Cambios al Punto de Venta para el manejo en Guatemala',
    'description': """ Cambios al Punto de Venta para el manejo en Guatemala """,
    'author': 'Rodrigo Fernandez',
    'website': 'http://aquih.com',
    'depends': ['point_of_sale', 'hr'],
    'data': [
        'views/pos_config_view.xml',
        'views/pos_extra_view.xml',
        'views/res_users_view.xml',
        'views/reports.xml',
        'views/reporte_cierre.xml',
        'views/pos_order_report_view.xml',
        'views/pos_order_view.xml',
        'views/account_views.xml',
        'security/pos_gt_security.xml',
        'security/ir.model.access.csv',
    ],
    'qweb': [
        'static/src/xml/pos_gt.xml',
    ],
    'installable': True,
    'auto_install': False,
    'assets': {
        'point_of_sale.assets': [
            'pos_gt/static/src/js/pos_gt.js',
        ],
        'web.assets_qweb': [
            'pos_gt/static/src/xml/**/*',
        ],
    }
}

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
