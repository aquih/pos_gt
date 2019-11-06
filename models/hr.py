# -*- coding: utf-8 -*-

from odoo import models, fields, api
import datetime
import logging

class hr_employee(models.Model):
    _inherit = 'hr.employee'

    clave_empleado = fields.Char('Clave POS')
