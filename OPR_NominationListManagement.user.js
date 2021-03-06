// ==UserScript==
// @name        OPR_NominationListManagement
// @namespace   asldufhiu32hr9283hf83123
// @include     https://wayfarer.nianticlabs.com/nominations*
// @author      @lokpro
// @updateURL https://github.com/Ingrass/OPR_NominationListManagement/raw/master/OPR_NominationListManagement.user.js
// @downloadURL https://github.com/Ingrass/OPR_NominationListManagement/raw/master/OPR_NominationListManagement.user.js
// @version     0.5.1
// @grant       none
// ==/UserScript==

/*
v0.5.1 25/Jan/2020
- cater for missing imgURL

v0.4.5 16/Jan/2020
- shows nominations submitted in past 14 days

v0.4.4 14/Jan/2020
- fixed button style

v0.4.3 9/Jan/2020
- custom view - added viewport for mobile devices

v0.4.2 9/Jan/2020
- custom view - added styles for WITHDRAWN

v0.4.1 8/Jan/2020
- compress head menu buttons to one row

v0.4 8/Jan/2020
- custom view - added colors and styles

v0.3.4 8/Jan/2020
- custom view - added "upgrade next" categroy

v0.3.3 7/Jan/2020
- rewritten code structure, no functional changes

v0.3.3 2/Jan/2020
- custom view - added "ALL" category

v0.3.2 27/12/2019
- 更動頭頂2 buttons位置以免蓋住系統的buttons

v0.3.1 28/10/2019
- custom view - added date ;分類瀏覽 加個日期

v0.3 28/10/2019
- 加入功能: 用分類的方式瀏覽；做了個框架，功能待加

v0.2 27/10/2019
- 加入功能: 把數據轉成 table，可copy到excel

v0.1 17/10/2019
- added hyperlinks to watermeter
*/

/* to-do
- 可選取
- 展示在一個map上
- 批量查水表
- 持續改善 ui
歡迎加入開發
*/

window.NLM = {}; // main page
NLM.CUSTOM = {}; // custom view
NLM.MAP = {}; // map view
NLM.css = {};

NLM.imgUrlToHashId = function( imgUrl ){
	if( imgUrl ){
		return imgUrl.replace( /=.{1,10}$|[^a-zA-Z0-9]/g, '' ).slice(- 10).toLowerCase();
	}else{
		return "0";
	}
};

NLM.appendCSS = function( css, toNode ){
	var style = document.createElement("style");
	style.type = "text/css";
	style.appendChild( document.createTextNode(css) );
	toNode.appendChild( style );
};
NLM.appendViewport = function( content, toNode ){
	var node=document.createElement('meta');
	node.name = "viewport";
	node.content = content;
	toNode.appendChild(node);
};

NLM.css.main = " \
#nom-table { \
	margin-left: 20%; \
} \
.nomination.card{ \
	position: relative; \
	overflow: visible; \
} \
.customButtonArea { \
	position: absolute; \
	top: 0; \
	left: -25%; \
	width: 25%; \
	padding-right: 2px; \
} \
.customButton{ \
	width: 100%; \
	display: block; \
	margin: 0; \
	text-align: center; \
} \
.buttonStyle{ \
	background-color: #008888; \
	color: #FFFCDE; \
} \
.buttonStyle:hover { \
	background-color: #5c8800; \
} \
.HeadCustomControl{ \
	float:left; \
	margin: 0 5px 5px 0; \
	border: 2px solid #0c4f51; \
	padding: 3px 8px; \
	display: inline-block; \
} \
div.HeadCustomControl{ \
	background-color: #c0ebeb; \
	color: #1D6753; \
} \
" ;

NLM.BUTTONS = [
{ onclick:"NLM.exportTable();", text:"Table" },
{ onclick:"NLM.openCustomView();", text:"NewView" },
{ onclick:"NLM.openMapView();", text:"Map" },
];

NLM.addControl = function( html ){
	NLM.headControlsContainer.innerHTML += html;
};

NLM.addButton = function( obj ){
	NLM.headControlsContainer.innerHTML +=
		"<button class='HeadCustomControl buttonStyle' onclick='"+obj.onclick+"'>"+obj.text+"</button>";
};

NLM.modifyDisplayList = function(){
	setTimeout( function(){
		var BASEURL = "https://brainstorming.azurewebsites.net/watermeter.html";

		var divs = document.querySelectorAll( "#nom-table .nomination" );

		var hashIds = [];
		
		for( var i=0; i<divs.length; i++ ){
			var hashId = "#"+ NLM.imgUrlToHashId( divs[i].querySelector("img").src );
			
			if( divs[i].querySelectorAll(".customButtonArea").length >0 ){
				continue;
			}
			divs[i].innerHTML = "<div class='customButtonArea'>"
				+"<button class='customButton buttonStyle' onclick='window.open(\""+BASEURL+hashId+"\", \"watermeter0\"); event.stopPropagation();'>水表</button>"
				+"</div>" + divs[i].innerHTML;
		}
	}, 1000 );
};

//===================================

NLM.showQuota = function(){
	var days = 14;
	
	var date = new Date();
	date.setDate( date.getDate()-days );

	var dd = date.getDate();
	var mm = date.getMonth()+1; 
	var yyyy = date.getFullYear();
	if(dd<10){
		dd='0'+dd;
	} 
	if(mm<10){
		 mm='0'+mm;
	}
	var dateStr = yyyy+"-"+mm+"-"+dd;
	var used = nomCtrl.nomList.reduce( (acc, cur)=>{ return acc+= cur.day>=dateStr?1:0; } ,  0 );
	NLM.addControl(
		"<div class='HeadCustomControl'>"+days+"-day: " +used+ "</div>"
	);
};

//===================================

NLM.css.exportTable = " \
table{ \
table-layout: fixed; \
} \
td, th { \
	border 1px solid black; \
	max-width: 300px; \
	overflow: ellipsis; \
} \
";

NLM.exportTable_COLUMNS = [
	//"order",
	"day",
	//"id",
	"imageUrl",
	"title",
	"description",
	"lat",
	"lng",
	"state",
	"city",
	"status",
	"upgraded",
	"nextUpgrade",
];

NLM.exportTable = function(){
	var COLUMNS = NLM.exportTable_COLUMNS;
	
	var table = document.createElement('table');
	var thead = document.createElement('thead');
	var tbody = document.createElement('tbody');

	var tr = document.createElement('tr');
	for (var col= 0; col<COLUMNS.length; col++) {
		var th = document.createElement('th');
		th.appendChild( document.createTextNode( COLUMNS[col] ) );
		tr.appendChild(th);
	}
	thead.appendChild( tr );

	for( var iNom=0; iNom<nomCtrl.nomList.length; iNom++ ){
		var nom = nomCtrl.nomList[iNom];

		var tr = document.createElement('tr');
    		for (var col= 0; col<COLUMNS.length; col++) {
			var td = document.createElement('td');
			td.appendChild( document.createTextNode( nom[ COLUMNS[col] ] ) );
			tr.appendChild(td);
		}
		tbody.appendChild( tr );
	}

	table.appendChild(thead);
	table.appendChild(tbody);
	
	var w = window.open();
	w.document.title = nomCtrl.length;
	w.document.body.appendChild( table );
	
	NLM.appendCSS( NLM.css.exportTable, w.document.body );
};

//===================================

NLM.CUSTOM.categoriseNomList = function( nomList ){
	var d = {
		ALL:[],
		status:{},
		upgraded:{
			true:[],
			false:[],
			next:[],
		},
	};

	for( var iNom=0; iNom<nomList.length; iNom++ ){
		var nom = nomList[iNom];
		
		d.ALL.push( nom );
		
		d.status[nom.status] = d.status[nom.status] || [];
		d.status[nom.status].push( nom );

		d.upgraded[nom.upgraded].push( nom );
		
		if( nom.nextUpgrade ){
			d.upgraded.next.push( nom );
		}
	}

	// === sort all by "day"
	for( var iL1 in d ){
		if( Array.isArray( d[iL1] ) ){
			d[iL1].sort( function(a,b){ a.day<b.day?1:-1 } );
		}else{
			for( var iL2 in d[iL1] ){
				d[iL1][iL2].sort( function(a,b){ a.day<b.day?1:-1 } );
			}
		}
	}

	return d;
}

NLM.CUSTOM.Class_CustomView = function(){
	this.win = window.open();
	this.win.customView = this;
	
	this.data = NLM.CUSTOM.categoriseNomList( nomCtrl.nomList );
	
	this.createMenu();
	this.displayContainer = new NLM.CUSTOM.Class_DisplayContainer( this );
	
	NLM.appendViewport(
		"width=560, initial-scale=1, user-scalable=yes"
		, this.win.document.head );
	
	NLM.appendCSS(
		NLM.css.customView + " " + NLM.css.nomBoxCategories
		, this.win.document.body );
	
	return this;
};

NLM.CUSTOM.Class_CustomView.prototype.createMenu = function(){
	var document = this.win.document;
	var data = this.data;

	var node = document.createElement("div");
	this.menuNode = node;

	for( var iL1 in data ){
		var level1Container = document.createElement("div");
		node.appendChild( level1Container );
		level1Container.className = "menu L1 container";

		var level1Button = document.createElement("div");
		level1Container.appendChild( level1Button );
		level1Button.className = "menu L1 button";
		
		
		if( Array.isArray( data[iL1] ) ){
			// for "ALL"
			level1Button.setAttribute('onclick', "customView.displayContainer.showNomList('"+iL1+"')");
			level1Button.innerText = iL1 + " (" + data[iL1].length + ")";
			
		}else{
			level1Button.innerText = iL1;
			
			var level2Container = document.createElement("div");
			level1Container.appendChild( level2Container );
			level2Container.className = "menu L2 container";

			for( var iL2 in data[iL1] ){
				var level2Button = document.createElement("div");
				level2Container.appendChild( level2Button );
				level2Button.className = "menu L2 button";
				level2Button.innerText = iL2 + " (" + data[iL1][iL2].length + ")";
				level2Button.setAttribute('onclick', "customView.displayContainer.showNomList('"+iL1+"','"+iL2+"')");
			}
		}
	}
	
	document.body.appendChild( node );
};

NLM.CUSTOM.Class_DisplayContainer = function( customView ){
	this.customView = customView;
	var document = customView.win.document;
	
	var node = this.node = document.createElement("div");
	node.className = "displayContainer";
	document.body.appendChild( node );
	
	customView.displayContainer = this;
	
	return this;
};

NLM.CUSTOM.Class_DisplayContainer.prototype.showNomList = function( key1, key2=null ){
	var document = this.customView.win.document;
	
	var displayContainer = document.querySelector(".displayContainer");
	displayContainer.innerHTML = '';
	var list = this.customView.data[key1];
	if( key2 !== null ){
		list = list[key2];
	}
	for (var iNom=0; iNom<list.length; iNom++ ) {
		var nom = list[iNom];
		this.showNomination( nom );
	}
};

NLM.CUSTOM.Class_DisplayContainer.prototype.showNomination = function( nom ){
	var document = this.customView.win.document;
	
	var classNames = [ "nomBox" ];
	classNames.push( "status-" + nom.status );
	if( nom.upgraded ) classNames.push( "upgraded" );
	if( nom.nextUpgrade ) classNames.push( "nextUpgrade" );
	
	var nomBox = document.createElement("div");
	this.node.appendChild( nomBox );
	nomBox.className = classNames.join(" ");
	nomBox.id = NLM.imgUrlToHashId( nom.imageUrl );

	var img = document.createElement("img");
	nomBox.appendChild( img );
	img.src = nom.imageUrl + "=s80";

	var title = document.createElement("div");
	nomBox.appendChild( title );
	title.innerText = nom.title;

	var date = document.createElement("div");
	nomBox.appendChild( date );
	date.innerText = nom.day;
	
	var button_watermeter = document.createElement("a");
	nomBox.appendChild( button_watermeter );
	button_watermeter.innerText = "水表";
	button_watermeter.className = "button";
	button_watermeter.href = "https://brainstorming.azurewebsites.net/watermeter.html#" + nomBox.id;
	button_watermeter.setAttribute('target', 'watermeter0');
};

NLM.css.customView = " \
* { \
	box-sizing: border-box; \
} \
body{ \
	background-color: #001212; \
} \
div.menu { \
	padding: 4px 7px; \
	display: inline-block; \
} \
.container{ \
	border: 1px solid #226767; \
} \
.menu.L1.container{ \
	margin-right: 20px; \
} \
.button{ \
	color: white; \
	background-color: #226767; \
	border: 3px solid #5BC5C5; \
	cursor: pointer; \
	display: inline-block; \
} \
.button:hover{ \
	background-color: #5BC5C5;\
	border-color: #226767; \
} \
.menu.button{ \
	margin: 2px; \
} \
.displayContainer{ \
	border: 1px solid #226767; \
	height: 80%; \
	margin-top: 5px; \
	overflow-y: scroll; \
} \
.nomBox{ \
	display: inline-block; \
	border: 1px solid #226767; \
	border-radius: 5px; \
	min-height: 100px; \
	width: 100px; \
	padding: 2px; \
	margin: 3px; \
	vertical-align: top; \
	text-align: center; \
} \
.nomBox .button{ \
padding: 3px; \
} \
.nomBox img{ \
	max-width: 70%; \
	max-height: 50%; \
	min-width: 50%; \
} \
.nomBox *{ \
	margin: 3px; \
	color: white; \
} \
";

NLM.css.nomBoxCategories = " \
.nomBox.status-NOMINATED { \
	border-color: #AAAAAA; \
} \
.nomBox.status-VOTING { \
	border-color: #DCDC00; \
	border-width: 2px; \
} \
.nomBox.status-ACCEPTED { \
	border-color: #59E759; \
	border-style: dashed; \
	border-width: 2px; \
} \
.nomBox.status-REJECTED { \
	border-color: #F75959; \
	border-style: dashed; \
} \
.nomBox.status-DUPLICATE { \
	border-color: #FFBE00; \
	border-style: dashed; \
} \
.nomBox.upgraded:after { \
	content : url('https://wayfarer.nianticlabs.com/img/lightning-20px.png'); \
} \
.nomBox.nextUpgrade:after { \
	content : url('https://wayfarer.nianticlabs.com/img/lightning-20px.png'); \
	border: 2px dotted #d752ff;\
	border-radius: 99px; \
	display: inline-block; \
} \
.nomBox.status-WITHDRAWN { \
	border-color: #F75959; \
	background-image: repeating-linear-gradient(45deg, #ff000033 5px, transparent 5px, transparent 10px, #ff000033 10px, #ff000033 15px); \
} \
";

NLM.openCustomView = function(){
	NLM.CUSTOM.customView = 
		new NLM.CUSTOM.Class_CustomView();
};

//===================================

NLM.MAP.Class_MapView = function(){
	this.win = window.open();
	
	with( this.win.document ){
		open("text/html", "replace");
		write('<HTML><HEAD> \
			<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.css" /> \
			<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.js"></script> \
		</HEAD><BODY><div id="mapid"></div><script>mapView.init();</script></BODY></HTML>');
		close();
	}
	
	this.win.mapView = this;
	this.data = NLM.CUSTOM.categoriseNomList( nomCtrl.nomList );
	
	return this;
};


NLM.MAP.Class_MapView.prototype.init = function(){
	var L = this.win.L;
	
	NLM.appendViewport(
		"width=device-width, initial-scale=1, user-scalable=no, maximum-scale=1, minimum-scale=1"
		, this.win.document.head );
	
	NLM.appendCSS(
		NLM.css.mapView
		, this.win.document.body );

	this.tileLayers = this.createTileLayers();
	this.markerLayers = {};
	this.allMarkersGroup = L.featureGroup();

	var mymap = this.mymap = L.map('mapid', {
		center: [22.165,113.56],
		zoom: 3,
		layers: this.tileLayers[ "CartoDB Light" ],
		wheelPxPerZoomLevel: 120,
		doubleClickZoom: false,
		renderer: L.canvas(),
	});
	
	
	for( var iStatus in this.data.status ){
		var nomList = this.data.status[iStatus];
		for( var iNom=0; iNom<nomList.length; iNom++ ){
			var nom = nomList[iNom];
			var coord = [ nom.lat, nom.lng ];
			var popup = L.popup({ minWidth:300, closeButton:false, autoPan:true })
				.setContent(
					"<img style='max-width:250px; height:auto;' src='"+nom.imageUrl+"'>"
					+"<p style='font-size:18px;'><a target='watermeter0' href='https://brainstorming.azurewebsites.net/watermeter.html#"+NLM.imgUrlToHashId( nom.imageUrl )+"'>"+nom.title+"</a><br>"+nom.day+"<br>"+nom.status+"</p>" );
			
			var marker = L.circleMarker( coord, {weight: 1, } );
			L.setOptions( marker, NLM.MAP.MARKER_OPTION_BY_STATUS[ nom.status ] );
			marker.setRadius( NLM.MAP.MARKER_OPTION_BY_STATUS[ nom.status ].radius || 7 );
			
			marker
				.bindTooltip( nom.title )
				.bindPopup( popup )
				
				.addTo( mymap )
				.addTo( this.markerLayers[nom.status] = this.markerLayers[nom.status] || new L.layerGroup().addTo( mymap ) )
				.addTo( this.allMarkersGroup );
		}
		
		// modify layer display names
		var layerName =
			"<span class='markerStatus "+iStatus+"'>"
			+iStatus+ " ("+nomList.length+")"
			+"</span>";
			
		this.markerLayers[layerName] = this.markerLayers[iStatus];
		delete this.markerLayers[iStatus];
	}
	
	mymap.fitBounds( this.allMarkersGroup.getBounds() );
	//===
	L.control.layers( this.tileLayers, this.markerLayers ).addTo(mymap);
};
	
NLM.MAP.Class_MapView.prototype.createTileLayers = function(){
	var L = this.win.L;
	
	return {
		"CartoDB Voyager": L.tileLayer( 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
			attribution:'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
			maxZoom: 19,
			noWrap: true,
		}),
		"CartoDB Light": L.tileLayer( 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
			attribution:'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
			maxZoom: 19,
			noWrap: true,
		}),
		"CartoDB Dark": L.tileLayer( 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
			attribution:'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
			maxZoom: 19,
			noWrap: true,
		}),
		OSM: L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: 'Map data © OpenStreetMap contributors',
			maxZoom: 19,
			noWrap: true,
		}),
		"Google Hybrid": L.tileLayer('http://{s}.google.com/vt/lyrs=y&hl=zh-TW&x={x}&y={y}&z={z}',{
			attribution: "Google",
			maxZoom: 21,
			noWrap: true,
			subdomains:['mt0','mt1','mt2','mt3'],
		}),
		"Google Satellite": L.tileLayer('http://{s}.google.com/vt/lyrs=s&hl=zh-TW&x={x}&y={y}&z={z}',{
			attribution: "Google",
			maxZoom: 21,
			noWrap: true,
			subdomains:['mt0','mt1','mt2','mt3'],
		}),
		"Google Roads": L.tileLayer('http://{s}.google.com/vt/lyrs=m&hl=zh-TW&x={x}&y={y}&z={z}',{
			attribution: "Google",
			maxZoom: 21,
			noWrap: true,
			subdomains:['mt0','mt1','mt2','mt3'],
		}),
	};
};

NLM.css.mapView = " \
html, body, #mapid { \
	height: 100%; \
	width: 100%; \
	padding:0px; \
	margin:0px; \
} \
.leaflet-control-layers-overlays>label{ \
	margin-bottom: 13px \
} \
.markerStatus { \
	border-width: 1px; \
	border-style: solid; \
	border-radius: 5px; \
	padding: 3px; \
} \
.markerStatus.NOMINATED { \
	border-color: #338888; \
	border-width: 2px; \
} \
.markerStatus.VOTING { \
	border-color: #DCDC00; \
	border-width: 2px; \
} \
.markerStatus.ACCEPTED { \
	border-color: #02D752; \
	border-style: dashed; \
	border-width: 2px; \
} \
.markerStatus.REJECTED { \
	border-color: #F75959; \
	border-style: dashed; \
} \
.markerStatus.DUPLICATE { \
	border-color: #FFBE00; \
	border-style: dashed; \
} \
.markerStatus.WITHDRAWN { \
	border-color: #571010; \
	border-style: dashed; \
	border-width: 2px; \
} \
";

NLM.MAP.MARKER_OPTION_BY_STATUS = {
	NOMINATED: {color:"#338888", weight:3, radius:10, },
	VOTING: {color:"#DCDC00", weight:3, radius:10, },
	ACCEPTED: {color:"#02D752", dashArray:"3,3",},
	REJECTED: {color:"#F75959", dashArray:"1,3",},
	DUPLICATE: {color:"#FFBE00", dashArray:"1,2",},
	WITHDRAWN: {color:"#571010", weight:3, radius:9, dashArray:"3,3,3,6",},
};

NLM.openMapView = function(){
	NLM.MAP.mapView = 
		new NLM.MAP.Class_MapView();
};

//===================================

NLM.init = function(){
	// add headControlsContainer
	var h = NLM.headControlsContainer = document.createElement("div");
	document.querySelector(".nomination-header").appendChild( h );
	
	// add Quota display
	NLM.showQuota();
	
	// add head buttons
	for( var i=0; i<NLM.BUTTONS.length; i++ ){
		NLM.addButton( NLM.BUTTONS[i] );
	}

	// modifyDisplayList
	nomCtrl.reload2 = nomCtrl.datasource.get;
	nomCtrl.datasource.get = function(){
	  var tReturn = nomCtrl.reload2.apply( nomCtrl.reload2, arguments);
	  NLM.modifyDisplayList();
	  return tReturn;
	};
	NLM.modifyDisplayList();

	// css
	NLM.appendCSS( NLM.css.main, document.body );
	NLM.appendCSS( NLM.css.modifyDisplayList, document.body );
};

var interval = setInterval( function(){
	// wait for var available
	try {
		window.nomCtrl = angular.element( document.querySelector("[ng-controller='NominationsController as nomCtrl']") ).scope().nomCtrl;
		if( nomCtrl.nomList.length == 0 ) return;
	} catch (e) {
		return;
	}
	// OK
	clearInterval( interval );
	NLM.init();
	
}, 100 );
