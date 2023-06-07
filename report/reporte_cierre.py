# -*- coding: utf-8 -*-

from odoo import api, models

class ReporteCierre(models.AbstractModel):
    _name = 'report.pos_gt.reporte_cierre'

    def lineas_ventas(self, docs):
        lineas = []
        for s in docs:
            for o in s.order_ids:
                lineas.append(o)
        return lineas

    def total_ventas(self, docs):
        total = 0
        for s in docs:
            for o in s.order_ids:
                total += o.amount_total
        return total

    def lineas_ingresos(self, docs):
        metodos = {}
        for s in docs:
            for o in s.order_ids:
                for p in o.payment_ids:
                    if p.payment_method_id.id not in metodos:
                        metodos[p.payment_method_id.id] = {'metodo': p.payment_method_id, 'total': 0}
                    metodos[p.payment_method_id.id]['total'] += p.amount
        return metodos.values()

    def total_ingresos(self, docs):
        total = 0
        for s in docs:
            total += s.total_payments_amount
        return total

    def lineas_egresos(self, docs):
        diarios = {}
        for s in docs:
            for l in s.statement_line_ids:
                if l.amount < 0:
                    if l.journal_id.id not in diarios:
                        diarios[l.journal_id.id] = {'diario': l.journal_id, 'total': 0}
                    diarios[l.journal_id.id]['total'] += l.amount
        return diarios.values()

    def total_egresos(self, docs):
        total = 0
        for s in docs:
            for l in s.statement_line_ids:
                if l.amount < 0:
                    total += l.amount
        return total

    @api.model
    def _get_report_values(self, docids, data=None):
        model = 'pos.session'
        docs = self.env[model].browse(docids)

        return {
            'doc_ids': self.ids,
            'doc_model': model,
            'docs': docs,
            'lineas_ventas': self.lineas_ventas,
            'total_ventas': self.total_ventas,
            'lineas_ingresos': self.lineas_ingresos,
            'total_ingresos': self.total_ingresos,
            'lineas_egresos': self.lineas_egresos,
            'total_egresos': self.total_egresos,
        }
