{
    'name': 'Punto de venta para Guatemala',
    'version': '7.5',
    'category': 'Point of Sale',
    'sequence': 6,
    'summary': 'Cambios al Punto de venta para el manejo en Guatemala',
    'description': """ Cambios al punto de venta para el manejo en Guatemala """,
    'author': 'aquíH',
    'website': 'http://www.aquih.com',
    'depends': ['l10n_gt_extra', 'pos_hr'],
    'data': [
        'views/pos_config_view.xml',
        'views/res_users_view.xml',
        'views/pos_order_view.xml',
        'report/report_views.xml',
        'report/reporte_cierre.xml',
        'security/pos_gt_security.xml',
        'security/ir.model.access.csv'
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
