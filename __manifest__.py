
# -*- coding: utf-8 -*-

{
    'name': 'Point of Sale para Guatemala',
    'version': '5.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'summary': 'Cambios al Punto de Venta para el manejo en Guatemala',
    'description': """ Cambios al Punto de Venta para el manejo en Guatemala """,
    'author': 'Rodrigo Fernandez',
    'website': 'http://aquih.com',
    'depends': ['l10n_gt_extra', 'pos_hr'],
    'data': [
        'views/pos_config_view.xml',
        'views/res_users_view.xml',
        'views/reports.xml',
        'views/reporte_cierre.xml',
        'views/pos_order_report_view.xml',
        'security/pos_gt_security.xml',
        'security/ir.model.access.csv',
        # 'views/pos_extra_view.xml',
        # 'views/pos_order_view.xml',
        # 'views/account_views.xml',
    ],
    'installable': True,
    'auto_install': False,
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_gt/static/src/**/*',
        ],
    },
    'license': 'Other OSI approved licence',
}