/**
 * Generates the Resource Tree in Ext
 * 
 * @class MODx.tree.Resource
 * @extends MODx.tree.Tree
 * @param {Object} config An object of options.
 * @xtype modx-tree-resource
 */
MODx.tree.Resource = function(config) {
    config = config || {};
    Ext.applyIf(config,{
        url: MODx.config.connectors_url+'resource/index.php'
        ,title: ''
        ,rootVisible: false
        ,expandFirst: true
        ,enableDD: !Ext.isEmpty(MODx.config.enable_dragdrop) ? true : false
        ,ddGroup: 'modx-treedrop-dd'
        ,remoteToolbar: true
        ,sortBy: MODx.config.tree_default_sort || 'menuindex'
        ,tbarCfg: {
            id: config.id ? config.id+'-tbar' : 'modx-tree-resource-tbar'
        }
        ,baseParams: {
            action: 'getNodes'
            ,sortBy: MODx.config.tree_default_sort || 'menuindex'
        }
    });
    MODx.tree.Resource.superclass.constructor.call(this,config);
    this.getLoader().baseParams.sortBy = Ext.state.Manager.get(this.treestate_id+'-sort') || (MODx.config.tree_default_sort || 'menuindex');
    this.on('render',function() {
        var el = Ext.get('modx-resource-tree');
        el.createChild({tag: 'div', id: 'modx-resource-tree_tb'});
        el.createChild({tag: 'div', id: 'modx-resource-tree_filter'});
    });
    this.addEvents('loadCreateMenus');
    this.on('afterSort',this._handleAfterDrop,this);
};
Ext.extend(MODx.tree.Resource,MODx.tree.Tree,{
    forms: {}
    ,windows: {}
    ,stores: {}

    ,_initExpand: function() {
        var treeState = Ext.state.Manager.get(this.treestate_id);
        if ((Ext.isString(treeState) || Ext.isEmpty(treeState)) && this.root) {
            if (this.root) {this.root.expand();}
            var wn = this.getNodeById('web_0');
            if (wn && this.config.expandFirst) {
                wn.select();
                wn.expand();
            }
        } else {
            for (var i=0;i<treeState.length;i++) {
                this.expandPath(treeState[i]);
            }
        }
    }


    /**
     * Shows the current context menu.
     * @param {Ext.tree.TreeNode} n The current node
     * @param {Ext.EventObject} e The event object run.
     */
    ,_showContextMenu: function(n,e) {
        n.select();
        this.cm.activeNode = n;
        this.cm.removeAll();
        if (n.attributes.menu && n.attributes.menu.items) {
            this.addContextMenuItem(n.attributes.menu.items);
            this.cm.show(n.getUI().getEl(),'t?');
        } else {
            var m = [];
            switch (n.attributes.type) {
                case 'modResource':
                    m = this._getModResourceMenu(n);
                    break;
                case 'modContext':
                    m = this._getModContextMenu(n);
                    break;
            }
            
            this.addContextMenuItem(m);
            this.cm.showAt(e.xy);
        }
        e.stopEvent();
    }

    ,duplicateResource: function(item,e) {
        var node = this.cm.activeNode;
        var id = node.id.split('_');id = id[1];

        var r = {
            resource: id
            ,is_folder: node.getUI().hasClass('folder')
        };
        var w = MODx.load({
            xtype: 'modx-window-resource-duplicate'
            ,resource: id
            ,is_folder: !node.attributes.hasChildren
            ,listeners: {
                'success': {fn:function() {this.refreshNode(node.id);},scope:this}
            }
        });
        w.setValues(r);
        w.show(e.target);
    }

    ,duplicateContext: function(itm,e) {
        var node = this.cm.activeNode;
        var key = node.attributes.pk;
        
        var r = { 
            key: key
            ,newkey: ''
        };
        if (!this.windows.duplicateContext) {
            this.windows.duplicateContext = MODx.load({
                xtype: 'modx-window-context-duplicate'
                ,record: r
                ,listeners: {
                    'success': {fn:function() {this.refresh();},scope:this}
                }
            });
        }
        this.windows.duplicateContext.setValues(r);
        this.windows.duplicateContext.show(e.target);
    }
    ,removeContext: function(itm,e) {
        var node = this.cm.activeNode;
        var key = node.attributes.pk;
        MODx.msg.confirm({
            title: _('context_remove')
            ,text: _('context_remove_confirm')
            ,url: MODx.config.connectors_url+'context/index.php'
            ,params: {
                action: 'remove'
                ,key: key
            }
            ,listeners: {
                'success': {fn:function() {this.refresh();},scope:this}
            }
        });
    }
    	
    ,preview: function() {
        window.open(this.cm.activeNode.attributes.preview_url);
    }
    
    ,deleteDocument: function(itm,e) {
        var node = this.cm.activeNode;
        var id = node.id.split('_');id = id[1];
        MODx.msg.confirm({
            title: _('resource_delete')
            ,text: _('resource_delete_confirm')
            ,url: MODx.config.connectors_url+'resource/index.php'
            ,params: {
                action: 'delete'
                ,id: id
            }
            ,listeners: {
                'success': {fn:function() {
                    var n = this.cm.activeNode;
                    var ui = n.getUI();
                    
                    ui.addClass('deleted');
                    n.cascade(function(nd) {
                        nd.getUI().addClass('deleted');
                    },this);
                    Ext.get(ui.getEl()).frame();
                },scope:this}
            }
        });
    }

    ,undeleteDocument: function(itm,e) {
        var node = this.cm.activeNode;
        var id = node.id.split('_');id = id[1];
        MODx.Ajax.request({
            url: MODx.config.connectors_url+'resource/index.php'
            ,params: {
                action: 'undelete'
                ,id: id
            }
            ,listeners: {
                'success': {fn:function() {
                    var n = this.cm.activeNode;
                    var ui = n.getUI();

                    ui.removeClass('deleted');
                    n.cascade(function(nd) {
                        nd.getUI().removeClass('deleted');
                    },this);
                    Ext.get(ui.getEl()).frame();
                },scope:this}
            }
        });
    }

    ,publishDocument: function(itm,e) {
        var node = this.cm.activeNode;
        var id = node.id.split('_');id = id[1];
        MODx.msg.confirm({
            title: _('resource_publish')
            ,text: _('resource_publish_confirm')
            ,url: MODx.config.connectors_url+'resource/index.php'
            ,params: {
                action: 'publish'
                ,id: id
            }
            ,listeners: {
                'success': {fn:function() {
                    var ui = this.cm.activeNode.getUI();
                    ui.removeClass('unpublished');
                    Ext.get(ui.getEl()).frame();
                },scope:this}
            }
        });
    }
	
    ,unpublishDocument: function(itm,e) {
        var node = this.cm.activeNode;
        var id = node.id.split('_');id = id[1];
        MODx.msg.confirm({
            title: _('resource_unpublish')
            ,text: _('resource_unpublish_confirm')
            ,url: MODx.config.connectors_url+'resource/index.php'
            ,params: {
                action: 'unpublish'
                ,id: id
            }
            ,listeners: {
                'success': {fn:function() {
                    var ui = this.cm.activeNode.getUI();
                    ui.addClass('unpublished');
                    Ext.get(ui.getEl()).frame();
                },scope:this}
            }
        });
    }
	
    ,emptyRecycleBin: function() {
        MODx.msg.confirm({
            title: _('empty_recycle_bin')
            ,text: _('empty_recycle_bin_confirm')
            ,url: MODx.config.connectors_url+'resource/index.php'
            ,params: {
                action: 'emptyRecycleBin'
            }
            ,listeners: {
                'success':{fn:function() {
                    Ext.select('div.deleted',this.getRootNode()).remove();
                    MODx.msg.status({
                        title: _('success')
                        ,message: _('empty_recycle_bin_emptied')
                    })
                },scope:this}
            }
        });
    }

    ,showFilter: function(itm,e) {
        if (this._filterVisible) {return false;}

        var t = Ext.get(this.config.id+'-tbar');
        var fbd = t.createChild({tag: 'div' ,cls: 'modx-formpanel' ,autoHeight: true});
        var tb = new Ext.Toolbar({
            applyTo: fbd
            ,autoHeight: true
            ,width: '100%'
        });
        var cb = new Ext.form.ComboBox({
            store: new Ext.data.SimpleStore({
                fields: ['name','value']
                ,data: [
                    [_('menu_order'),'menuindex']
                    ,[_('page_title'),'pagetitle']
                    ,[_('publish_date'),'pub_date']
                    ,[_('createdon'),'createdon']
                    ,[_('editedon'),'editedon']
                    ,[_('publishedon'),'publishedon']
                ]
            })
            ,displayField: 'name'
            ,valueField: 'value'
            ,editable: false
            ,mode: 'local'
            ,id: 'modx-resource-tree-sortby'
            ,triggerAction: 'all'
            ,selectOnFocus: false
            ,width: 100
            ,value: this.config.sortBy || (Ext.state.Manager.get(this.treestate_id+'-sort') || MODx.config.tree_default_sort)
            ,listeners: {
                'select': {fn:this.filterSort,scope:this}
            }
        });
        tb.add(_('sort_by')+':');
        tb.addField(cb);
        tb.add('-',{
            scope: this
            ,cls: 'x-btn-text'
            ,text: _('close')
            ,handler: this.hideFilter
        });
        tb.doLayout();
        this.filterBar = tb;
        this._filterVisible = true;
        return true;
    }
	
    ,filterSort: function(cb,r,i) {
        Ext.state.Manager.set(this.treestate_id+'-sort',cb.getValue());
        this.config.sortBy = cb.getValue();
        this.getLoader().baseParams = {
            action: this.config.action
            ,sortBy: this.config.sortBy
        };
        this.refresh();
    }

    ,hideFilter: function(itm,e) {
        this.filterBar.destroy();
        this._filterVisible = false;
    }
    ,_handleAfterDrop: function(o,r) {
        var targetNode = o.event.target;
        if (o.event.point == 'append' && targetNode) {
            var ui = targetNode.getUI();
            ui.addClass('haschildren');
            ui.removeClass('icon-resource');
        }
    }
	
    ,_handleDrop:  function(e){
        var dropNode = e.dropNode;
        var targetParent = e.target;

        if (targetParent.findChild('id',dropNode.attributes.id) !== null) {return false;}        
        var ap = true;
        if (targetParent.attributes.type == 'context' && e.point != 'append') {
            ap = false;
        }        
        return dropNode.attributes.text != 'root' && dropNode.attributes.text !== '' 
            && targetParent.attributes.text != 'root' && targetParent.attributes.text !== ''
            && ap;
    }
    
    ,quickCreate: function(itm,e,cls,ctx,p) {
        cls = cls || 'modResource';
        var r = {
            class_key: cls
            ,context_key: ctx || 'web'
            ,'parent': p || 0
        };
        
        var w = MODx.load({
            xtype: 'modx-window-quick-create-modResource'
            ,record: r
            ,listeners: {
                'success':{fn:function() { 
                    var node = this.getNodeById(this.cm.activeNode.id);
                    if (node) {
                        var n = node.parentNode ? node.parentNode : node;
                        this.getLoader().load(n,function() {
                            n.expand();
                        },this);
                    }
                },scope:this}
                ,'hide':{fn:function() {this.destroy();}}
                ,'show':{fn:function() {this.center();}}
            }
        });
        w.setValues(r);
        w.show(e.target,function() {
            Ext.isSafari ? w.setPosition(null,30) : w.center();
        },this);
    }
    
    ,quickUpdate: function(itm,e,cls) {        
        MODx.Ajax.request({
            url: MODx.config.connectors_url+'resource/index.php'
            ,params: {
                action: 'get'
                ,id: this.cm.activeNode.attributes.pk
            }
            ,listeners: {
                'success': {fn:function(r) {
                    var pr = r.object;
                    pr.class_key = cls;
                    
                    var w = MODx.load({
                        xtype: 'modx-window-quick-update-modResource'
                        ,record: pr
                        ,listeners: {
                            'success':{fn:function() { 
                                this.refreshNode(this.cm.activeNode.id);
                            },scope:this}
                            ,'hide':{fn:function() {this.destroy();}}
                        }
                    });
                    w.setValues(r.object);
                    w.show(e.target,function() {
                        Ext.isSafari ? w.setPosition(null,30) : w.center();
                    },this);
                },scope:this}
            }
        });
    }

    ,_getModContextMenu: function(n) {
        var a = n.attributes;
        var ui = n.getUI();
        var m = [];

        m.push({
            text: '<b>'+a.text+'</b>'
            ,handler: function() {return false;}
            ,header: true
        });
        m.push('-');
        if (ui.hasClass('pedit')) {
            m.push({
                text: _('edit_context')
                ,handler: function() {
                    var at = this.cm.activeNode.attributes;
                    this.loadAction('a='+MODx.action['context/update']+'&key='+at.pk);
                }
            });
        }
        m.push({
            text: _('context_refresh')
            ,handler: function() {
                this.refreshNode(this.cm.activeNode.id,true);
            }
        });
        if (ui.hasClass('pnewdoc')) {
            m.push('-');
            this._getCreateMenus(m,'0',ui);
        }
        if (ui.hasClass('pnew')) {
            m.push({
                text: _('context_duplicate')
                ,handler: this.duplicateContext
            });
        }
        if (ui.hasClass('pdelete')) {
            m.push('-');
            m.push({
                text: _('context_remove')
                ,handler: this.removeContext
            });
        }
        return m;
    }

    ,_getModResourceMenu: function(n) {
        var a = n.attributes;
        var ui = n.getUI();
        var m = [];
        m.push({
            text: '<b>'+a.text+'</b>'
            ,handler: function() {return false;}
            ,header: true
        });
        m.push('-');
        if (ui.hasClass('pview')) {
            m.push({
                text: _('resource_view')
                ,handler: function() {this.loadAction('a='+MODx.action['resource/data'])}
            });
        }
        if (ui.hasClass('pedit')) {
            m.push({
                text: _('resource_edit')
                ,handler: function() {this.loadAction('a='+MODx.action['resource/update']);}
            });
        }
        if (ui.hasClass('pqupdate')) {
            m.push({
                text: _('quick_update_resource')
                ,classKey: a.classKey
                ,handler: function(itm,e) {
                    Ext.getCmp("modx-resource-tree").quickUpdate(itm,e,itm.classKey);
                }
            });
        }
        if (ui.hasClass('pnew')) {
            m.push({
                text: _('resource_duplicate')
                ,handler: this.duplicateResource
            });
        }
        m.push({
            text: _('resource_refresh')
            ,handler: function() {
                this.refreshNode(this.cm.activeNode.id);
            }
            ,scope: this
        })

        if (ui.hasClass('pnew')) {
            m.push('-');
            this._getCreateMenus(m,null,ui);
        }

        if (ui.hasClass('psave')) {
            m.push('-');
            if (ui.hasClass('ppublish') && ui.hasClass('unpublished')) {
                m.push({
                    text: _('resource_publish')
                    ,handler: this.publishDocument
                });
            } else if (ui.hasClass('punpublish')) {
                m.push({
                    text: _('resource_unpublish')
                    ,handler: this.unpublishDocument
                });
            }
            if (ui.hasClass('pundelete') && ui.hasClass('deleted')) {
                m.push({
                    text: _('resource_undelete')
                    ,handler: this.undeleteDocument
                });
            } else if (ui.hasClass('pdelete') && !ui.hasClass('deleted')) {
                m.push({
                    text: _('resource_delete')
                    ,handler: this.deleteDocument
                });
            }
        }
        if (ui.hasClass('pview')) {
            m.push('-');
            m.push({
                text: _('resource_preview')
                ,handler: this.preview
            });
        }
        return m;
    }

    ,_getCreateMenus: function(m,pk,ui) {
        var types = MODx.resourceTypes || {
            'document': 'modDocument'
            ,'weblink': 'modWebLink'
            ,'symlink': 'modSymLink'
            ,'static_resource': 'modStaticResource'
        };
        if (MODx.config.custom_resource_classes) {
            var crcs = MODx.config.custom_resource_classes;
            if (!Ext.isEmpty(crcs)) {
                for (var k in crcs) {
                    types[k] = crcs[k];
                }
            }
        }
        var o = this.fireEvent('loadCreateMenus',types);
        if (Ext.isObject(o)) {
            Ext.apply(types,o);
        }
        var ct = [];
        var qct = [];
        for (var k in types) {
            ct.push({
                text: _(k+'_create_here')
                ,classKey: types[k]
                ,usePk: pk ? pk : false
                ,handler: function(itm) {
                    var at = this.cm.activeNode.attributes;
                    var p = itm.usePk ? itm.usePk : at.pk;
                    Ext.getCmp('modx-resource-tree').loadAction(
                        'a='+MODx.action['resource/create']
                        + '&class_key='+itm.classKey
                        + '&parent='+p
                        + (at.ctx ? '&context_key='+at.ctx : '')
                    );
                }
                ,scope: this
            });
            if (ui && ui.hasClass('pqcreate')) {
                qct.push({
                    text: _(k)
                    ,classKey: types[k]
                    ,handler: function(itm,e) {
                        var at = this.cm.activeNode.attributes;
                        var p = itm.usePk ? itm.usePk : at.pk;
                        Ext.getCmp('modx-resource-tree').quickCreate(itm,e,itm.classKey,at.ctx,p);
                    }
                    ,scope: this
                });
            }
        }
        m.push({
            text: _('create')
            ,handler: function() {return false;}
            ,menu: {items: ct}
        });
        if (ui && ui.hasClass('pqcreate')) {
            m.push({
               text: _('quick_create')
               ,handler: function() {return false;}
               ,menu: {items: qct}
            });
        }
        return m;
    }
});
Ext.reg('modx-tree-resource',MODx.tree.Resource);



MODx.window.QuickCreateResource = function(config) {
    config = config || {};
    this.ident = config.ident || 'qcr'+Ext.id();
    Ext.applyIf(config,{
        title: _('quick_create_resource')
        ,id: this.ident
        ,width: 620
        ,url: MODx.config.connectors_url+'resource/index.php'
        ,action: 'create'
        ,shadow: false
        ,fields: [{
            xtype: 'modx-tabs'
            ,bodyStyle: { background: 'transparent' }
            ,deferredRender: false
            ,autoHeight: true
            ,items: [{
                title: _('resource')
                ,layout: 'form'
                ,cls: 'modx-panel'
                ,bodyStyle: { background: 'transparent', padding: '10px' }
                ,autoHeight: true
                ,labelWidth: 100
                ,items: [{
                    xtype: 'modx-combo-template'
                    ,name: 'template'
                    ,id: 'modx-'+this.ident+'-template'
                    ,fieldLabel: _('template')
                    ,editable: false
                    ,anchor: '100%'
                    ,baseParams: {
                        action: 'getList'
                        ,combo: '1'
                    }
                    ,value: MODx.config.default_template
                },{
                    xtype: 'textfield'
                    ,name: 'pagetitle'
                    ,id: 'modx-'+this.ident+'-pagetitle'
                    ,fieldLabel: _('pagetitle')
                    ,anchor: '100%'
                },{
                    xtype: 'textfield'
                    ,name: 'longtitle'
                    ,id: 'modx-'+this.ident+'-longtitle'
                    ,fieldLabel: _('long_title')
                    ,anchor: '100%'
                },{
                    xtype: 'textarea'
                    ,name: 'description'
                    ,id: 'modx-'+this.ident+'-description'
                    ,fieldLabel: _('description')
                    ,anchor: '100%'
                    ,grow: false
                    ,height: 50
                },{
                    xtype: 'textfield'
                    ,name: 'alias'
                    ,id: 'modx-'+this.ident+'-alias'
                    ,fieldLabel: _('alias')
                    ,anchor: '100%'
                },{
                    xtype: 'textarea'
                    ,name: 'introtext'
                    ,id: 'modx-'+this.ident+'-introtext'
                    ,fieldLabel: _('introtext')
                    ,anchor: '100%'
                    ,height: 50
                },{
                    xtype: 'textfield'
                    ,name: 'menutitle'
                    ,id: 'modx-'+this.ident+'-menutitle'
                    ,fieldLabel: _('resource_menutitle')
                    ,anchor: '100%'
                },
                MODx.getQRContentField(this.ident,config.record.class_key)]
            },{
                id: 'modx-'+this.ident+'-settings'
                ,title: _('settings')
                ,layout: 'form'
                ,cls: 'modx-panel'
                ,autoHeight: true
                ,forceLayout: true
                ,labelWidth: 100
                ,defaults: {autoHeight: true ,border: false}
                ,style: 'background: transparent;'
                ,bodyStyle: { background: 'transparent', padding: '10px' }
                ,items: MODx.getQRSettings(this.ident,config.record)
            }]
        }]
       ,keys: [{
            key: Ext.EventObject.ENTER
            ,shift: true
            ,fn: this.submit
            ,scope: this
        }]
    });
    MODx.window.QuickCreateResource.superclass.constructor.call(this,config);
};
Ext.extend(MODx.window.QuickCreateResource,MODx.Window);
Ext.reg('modx-window-quick-create-modResource',MODx.window.QuickCreateResource);

MODx.window.QuickUpdateResource = function(config) {
    config = config || {};
    this.ident = config.ident || 'qur'+Ext.id();
    Ext.applyIf(config,{
        title: _('quick_update_resource')
        ,id: this.ident
        ,width: 620
        ,url: MODx.config.connectors_url+'resource/index.php'
        ,action: 'update'
        ,autoHeight: true
        ,shadow: false
        ,fields: [{
            xtype: 'modx-tabs'
            ,bodyStyle: { background: 'transparent' }
            ,autoHeight: true
            ,deferredRender: false
            ,items: [{
                title: _('resource')
                ,layout: 'form'
                ,cls: 'modx-panel'
                ,bodyStyle: { background: 'transparent', padding: '10px' }
                ,autoHeight: true
                ,labelWidth: 100
                ,items: [{
                    xtype: 'hidden'
                    ,name: 'id'
                    ,id: 'modx-'+this.ident+'-id'
                },{
                    xtype: 'modx-combo-template'
                    ,name: 'template'
                    ,id: 'modx-'+this.ident+'-template'
                    ,fieldLabel: _('template')
                    ,editable: false
                    ,anchor: '100%'
                    ,baseParams: {
                        action: 'getList'
                        ,combo: '1'
                    }
                },{
                    xtype: 'textfield'
                    ,name: 'pagetitle'
                    ,id: 'modx-'+this.ident+'-pagetitle'
                    ,fieldLabel: _('pagetitle')
                    ,anchor: '100%'
                },{
                    xtype: 'textfield'
                    ,name: 'longtitle'
                    ,id: 'modx-'+this.ident+'-longtitle'
                    ,fieldLabel: _('long_title')
                    ,anchor: '100%'
                },{
                    xtype: 'textarea'
                    ,name: 'description'
                    ,id: 'modx-'+this.ident+'-description'
                    ,fieldLabel: _('description')
                    ,anchor: '100%'
                    ,grow: false
                    ,height: 50
                },{
                    xtype: 'textfield'
                    ,name: 'alias'
                    ,id: 'modx-'+this.ident+'-alias'
                    ,fieldLabel: _('alias')
                    ,anchor: '100%'
                },{
                    xtype: 'textfield'
                    ,name: 'menutitle'
                    ,id: 'modx-'+this.ident+'-menutitle'
                    ,fieldLabel: _('resource_menutitle')
                    ,anchor: '100%'
                },{
                    xtype: 'textarea'
                    ,name: 'introtext'
                    ,id: 'modx-'+this.ident+'-introtext'
                    ,fieldLabel: _('introtext')
                    ,anchor: '100%'
                    ,height: 50
                },
                MODx.getQRContentField(this.ident,config.record.class_key)]
            },{
                id: 'modx-'+this.ident+'-settings'
                ,title: _('settings'),layout: 'form'
                ,cls: 'modx-panel'
                ,autoHeight: true
                ,forceLayout: true
                ,labelWidth: 100
                ,defaults: {autoHeight: true ,border: false}
                ,style: 'background: transparent;'
                ,bodyStyle: { background: 'transparent', padding: '10px' }
                ,items: MODx.getQRSettings(this.ident,config.record)
            }]
        }]
       ,keys: [{
            key: Ext.EventObject.ENTER
            ,shift: true
            ,fn: this.submit
            ,scope: this
        }]
        ,buttons: [{
            text: config.cancelBtnText || _('cancel')
            ,scope: this
            ,handler: function() { this.hide(); }
        },{
            text: config.saveBtnText || _('save')
            ,scope: this
            ,handler: function() { this.submit(false); }
        },{
            text: config.saveBtnText || _('save_and_close')
            ,scope: this
            ,handler: this.submit
        }]
    });
    MODx.window.QuickUpdateResource.superclass.constructor.call(this,config);
};
Ext.extend(MODx.window.QuickUpdateResource,MODx.Window);
Ext.reg('modx-window-quick-update-modResource',MODx.window.QuickUpdateResource);


MODx.getQRContentField = function(id,cls) {
    id = id || 'qur';
    cls = cls || 'modResource';    
    var o = {};
    switch (cls) {
        case 'modSymLink':
            o = {
                xtype: 'textfield'
                ,fieldLabel: _('symlink')
                ,name: 'content'
                ,id: 'modx-'+id+'-content'
                ,anchor: '100%'
                ,maxLength: 255
                ,allowBlank: false
            };
            break;
        case 'modWebLink':
            o = {
                xtype: 'textfield'
                ,fieldLabel: _('weblink')
                ,name: 'content'
                ,id: 'modx-'+id+'-content'
                ,anchor: '100%'
                ,maxLength: 255
                ,value: 'http://'
                ,allowBlank: false
            };
            break;
        case 'modStaticResource':
            o = {
                xtype: 'modx-combo-browser'
                ,browserEl: 'modx-browser'
                ,prependPath: false
                ,prependUrl: false
                ,hideFiles: true
                ,fieldLabel: _('static_resource')
                ,name: 'content'
                ,id: 'modx-'+id+'-content'
                ,anchor: '100%'
                ,maxLength: 255
                ,value: ''
                ,listeners: {
                    'select':{fn:function(data) {
                        if (data.url.substring(0,1) == '/') {
                            Ext.getCmp('modx-'+id+'-content').setValue(data.url.substring(1));
                        }   
                    },scope:this}
                }
            };
            break;
        case 'modResource':
        default:
            o = {
                xtype: 'textarea'
                ,name: 'content'
                ,id: 'modx-'+id+'-content'
                ,hideLabel: true
                ,labelSeparator: ''
                ,anchor: '100%'
                ,height: 300
            };
            break;
    }
    return o;
};

MODx.getQRSettings = function(id,va) {
    id = id || 'qur';
    return [{
        xtype: 'hidden'
        ,name: 'parent'
        ,id: 'modx-'+id+'-parent'
        ,value: va['parent']
    },{
        xtype: 'hidden'
        ,name: 'context_key'
        ,id: 'modx-'+id+'-context_key'
        ,value: va['context_key']
    },{
        xtype: 'hidden'
        ,name: 'class_key'
        ,id: 'modx-'+id+'-class_key'
        ,value: va['class_key']
    },{
        xtype: 'hidden'
        ,name: 'publishedon'
        ,id: 'modx-'+id+'-publishedon'
        ,value: va['publishedon']
    },{
        xtype: 'checkbox'
        ,name: 'published_cb'
        ,id: 'modx-'+id+'-published'
        ,fieldLabel: _('resource_published')
        ,description: _('resource_published_help')
        ,inputValue: 1
        ,submitValue: false
        ,checked: va['published'] !== undefined ? va['published'] : (MODx.config.publish_default == '1' ? 1 : 0)
        ,listeners: {'check': {fn:MODx.handleQUCB}}
    },{
        xtype: 'hidden'
        ,name: 'published'
        ,id: 'modx-'+id+'-published-hd'
        ,value: va['published'] !== undefined ? va['published'] : (MODx.config.publish_default == '1' ? 1 : 0)
        
    },{
        xtype: 'checkbox'
        ,fieldLabel: _('resource_folder')
        ,description: _('resource_folder_help')
        ,name: 'isfolder_cb'
        ,id: 'modx-'+id+'-isfolder'
        ,inputValue: 1
        ,submitValue: false
        ,checked: va['isfolder'] != undefined ? va['isfolder'] : false
        ,listeners: {'check': {fn:MODx.handleQUCB}}
    },{
        xtype: 'hidden'
        ,name: 'isfolder'
        ,id: 'modx-'+id+'-isfolder-hd'
        ,value: va['isfolder'] != undefined ? va['isfolder'] : false
        
    },{
        xtype: 'checkbox'
        ,fieldLabel: _('resource_richtext')
        ,description: _('resource_richtext_help')
        ,name: 'richtext_cb'
        ,id: 'modx-'+id+'-richtext'
        ,inputValue: 1
        ,submitValue: false
        ,checked: va['richtext'] !== undefined ? (va['richtext'] ? 1 : 0) : (MODx.config.richtext_default == '1' ? 1 : 0)
        ,listeners: {'check': {fn:MODx.handleQUCB}}
    },{
        xtype: 'hidden'
        ,name: 'richtext'
        ,id: 'modx-'+id+'-richtext-hd'
        ,value: va['richtext'] !== undefined ? (va['richtext'] ? 1 : 0) : (MODx.config.richtext_default == '1' ? 1 : 0)
        
    },{
        xtype: 'checkbox'
        ,fieldLabel: _('resource_searchable')
        ,description: _('resource_searchable_help')
        ,name: 'searchable_cb'
        ,id: 'modx-'+id+'-searchable'
        ,inputValue: 1
        ,submitValue: false
        ,checked: va['searchable'] != undefined ? va['searchable'] : (MODx.config.search_default == '1' ? 1 : 0)
        ,listeners: {'check': {fn:MODx.handleQUCB}}
    },{
        xtype: 'hidden'
        ,name: 'searchable'
        ,id: 'modx-'+id+'-searchable-hd'
        ,value: va['searchable'] != undefined ? va['searchable'] : (MODx.config.search_default == '1' ? 1 : 0)

    },{
        xtype: 'checkbox'
        ,fieldLabel: _('resource_hide_from_menus')
        ,description: _('resource_hide_from_menus_help')
        ,name: 'hidemenu_cb'
        ,id: 'modx-'+id+'-hidemenu'
        ,inputValue: 1
        ,submitValue: false
        ,checked: va['hidemenu'] != undefined ? va['hidemenu'] : (MODx.config.hidemenu_default == '1' ? 1 : 0)
        ,listeners: {'check': {fn:MODx.handleQUCB}}
    },{
        xtype: 'hidden'
        ,name: 'hidemenu'
        ,id: 'modx-'+id+'-hidemenu-hd'
        ,value: va['hidemenu'] != undefined ? va['hidemenu'] : (MODx.config.hidemenu_default == '1' ? 1 : 0)
    },{
        xtype: 'checkbox'
        ,fieldLabel: _('resource_cacheable')
        ,description: _('resource_cacheable_help')
        ,name: 'cacheable_cb'
        ,id: 'modx-'+id+'-cacheable'
        ,inputValue: 1
        ,submitValue: false
        ,checked: va['cacheable'] != undefined ? va['cacheable'] : (MODx.config.cache_default == '1' ? 1 : 0)
        ,listeners: {'check': {fn:MODx.handleQUCB}}
    },{
        xtype: 'hidden'
        ,name: 'cacheable'
        ,id: 'modx-'+id+'-cacheable-hd'
        ,value: va['cacheable'] != undefined ? va['cacheable'] : (MODx.config.cache_default == '1' ? 1 : 0)

    },{
        xtype: 'checkbox'
        ,name: 'clearCache'
        ,id: 'modx-'+id+'-clearcache'
        ,fieldLabel: _('clear_cache_on_save')
        ,description: _('clear_cache_on_save_msg')
        ,inputValue: 1
        ,checked: true
    }];
};
MODx.handleQUCB = function(cb) {
    var h = Ext.getCmp(cb.id+'-hd');
    if (cb.checked && h) {
        cb.setValue(1);
        h.setValue(1);
    } else if (h) {
        cb.setValue(0);
        h.setValue(0);
    }
}
