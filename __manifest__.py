
# -*- coding: utf-8 -*-

{
    'name': 'Point of Sale para Guatemala',
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'summary': 'Cambios al Punto de Venta para el manejo en Guatemala',
    'description': """ Cambios al Punto de Venta para el manejo en Guatemala """,
    'author': 'Rodrigo Fernandez',
    'depends': ['point_of_sale','mrp'],
    'data': [
        'views/pos_config_view.xml',
        'views/pos_extra_view.xml',
        'views/res_users_view.xml',
        'views/templates.xml',
        'views/reports.xml',
        'views/reporte_cierre.xml',
        'views/pos_order_report_view.xml',
        'views/mrp_bom_view.xml',
        'security/pos_gt_security.xml',
        'security/ir.model.access.csv',
    ],
    'qweb': [
        'static/src/xml/pos_gt.xml',
    ],
    'installable': True,
    'website': 'http://solucionesprisma.com',
    'auto_install': False,
}

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
