/**
 * Loads a grid of Manager Logs.
 * 
 * @class MODx.grid.ManagerLog
 * @extends MODx.grid.Grid
 * @param {Object} config An object of options.
 * @xtype modx-grid-manager-log
 */
MODx.grid.ManagerLog = function(config) {
    config = config || {};
    Ext.applyIf(config,{
        title: _('manager_log')
        ,id: 'modx-grid-manager-log'
        ,url: MODx.config.connectors_url+'system/log.php'
        ,fields: ['id','user','username','occurred','action','classKey','item','name','menu']
        ,autosave: false
        ,paging: true
        ,columns: [{
            header: _('occurred')
            ,dataIndex: 'occurred'
            ,width: 125
        },{
            header: _('user')
            ,dataIndex: 'username'
            ,width: 125
            ,editable: false
        },{
            header: _('action')
            ,dataIndex: 'action'
            ,width: 125
        },{
            header: 'Object'
            ,dataIndex: 'name'
            ,width: 300
        }]
        ,tbar: [{
            xtype: 'button'
            ,text: _('filter_clear')
            ,scope: this
            ,handler: function() {
                var fp = Ext.getCmp(this.config.formpanel);
                if (fp) {
                    fp.getForm().reset();
                    fp.filter();
                }
            }
        },'->',{
            xtype: 'button'
            ,text: _('mgrlog_clear')
            ,scope: this
            ,handler: function() {
                var fp = Ext.getCmp(this.config.formpanel);
                if (fp) {
                    fp.clearLog();
                }
            }
        }]
    });
    MODx.grid.ManagerLog.superclass.constructor.call(this,config);
};
Ext.extend(MODx.grid.ManagerLog,MODx.grid.Grid);
Ext.reg('modx-grid-manager-log',MODx.grid.ManagerLog);

/**
 * Loads the Manager Log filter panel.
 * 
 * @class MODx.panel.ManagerLog
 * @extends MODx.FormPanel
 * @constructor
 * @param {Object} config An object of options.
 * @xtype panel-manager-log
 */
MODx.panel.ManagerLog = function(config) {
    config = config || {};
    Ext.applyIf(config,{
        id: 'modx-panel-manager-log'
        ,defaults: { collapsible: false ,autoHeight: true }
        ,items: [{
            html: '<h2>'+_('mgrlog_view')+'</h2>'
            ,border: false
            ,cls: 'modx-page-header'
            ,id: 'manager-log-header'
        },MODx.getPageStructure([{
            title: _('mgrlog_query')
            ,layout: 'form'
            ,bodyStyle: 'padding: 15px;'
            ,defaults: { border: false ,msgTarget: 'side' }
            ,items: [{
                html: '<p>'+_('mgrlog_query_msg')+'</p>'
                ,border: false
            },{
                xtype: 'modx-combo-user'
                ,fieldLabel: _('user')
                ,name: 'user'
                ,listeners: {
                    'select': {fn: this.filter, scope: this}
                }
            },{
                xtype: 'textfield'
                ,fieldLabel: _('action')
                ,name: 'actionType'
                ,listeners: {
                    'change': {fn: this.filter, scope: this}
                    ,'render': {fn:this._addEnterKeyHandler}
                }
            },{
                xtype: 'datefield'
                ,fieldLabel: _('date_start')
                ,name: 'dateStart'
                ,allowBlank: true
                ,listeners: {
                    'select': {fn: this.filter, scope: this}
                    ,'render': {fn:this._addEnterKeyHandler}
                }
            },{
                xtype: 'datefield'
                ,fieldLabel: _('date_end')
                ,name: 'dateEnd'
                ,allowBlank: true
                ,listeners: {
                    'select': {fn: this.filter, scope: this}
                    ,'render': {fn:this._addEnterKeyHandler}
                }
            },MODx.PanelSpacer,{
                xtype: 'modx-grid-manager-log'
                ,preventRender: true
                ,formpanel: 'modx-panel-manager-log'
            }]
        }])]
    });
    MODx.panel.ManagerLog.superclass.constructor.call(this,config);
};
Ext.extend(MODx.panel.ManagerLog,MODx.FormPanel,{    
    filter: function(tf,newValue,oldValue) {
        var p = this.getForm().getValues();
        var g = Ext.getCmp('modx-grid-manager-log');
        p.action = 'getList';
        g.getStore().baseParams = p;
        g.getStore().load({
            params: p
            ,start: 0
            ,limit: 20
        });
        g.getBottomToolbar().changePage(1);
    }
    
    ,_addEnterKeyHandler: function() {
        this.getEl().addKeyListener(Ext.EventObject.ENTER,function() {
            this.fireEvent('change');
        },this);
    }
    
    ,clearLog: function(btn,e) {        
        MODx.msg.confirm({
            title: _('warning')
            ,text: _('mgrlog_clear_confirm')
            ,url: MODx.config.connectors_url+'system/log.php'
            ,params: {
                action: 'truncate'
            }
            ,listeners: {
                'success': {fn:function() {
                    Ext.getCmp('modx-grid-manager-log').refresh();
                },scope:this}
            }
        });
    }
});
Ext.reg('modx-panel-manager-log',MODx.panel.ManagerLog);