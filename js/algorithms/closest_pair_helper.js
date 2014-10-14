window.initVisualisation = function(graphics){
    var names = {
        tabs: ["3D Demonstration", "2D Demonstration", "Code Sample"],
    };

    var tabList = "", tabContent = "";
    for(var i = 0;i < names.tabs.length;i++){
        tabList += "<li id=\"link" + i + "\" class=\"" + (i == 0 ? "active" : "") + "\">";
        tabList += "<a href=\"#tab" + i + "\" data-toggle=\"tab\">" + names.tabs[i] + "</a>";
        tabList += "</li>";

        tabContent += "<div class=\"tab-pane fade" + (i == 0 ? " active in" : "") + "\" id=\"tab" + i + "\">";
        if(i == 0 || i == 1){
            tabContent += "<div class=\"canvas\" style=\"float: left;width: 800px;height: 800px\"></div>";
            tabContent += "<div class=\"menu\" style=\"float: right;\"></div>";
        }
        tabContent += "</div>";
    }
    jQuery("#tabList").html(tabList);
    jQuery("#tabContent").html(tabContent);

    var result3, result2;

    // Start it up
    jQuery("#tab0 .canvas").html(graphics.renderer.domElement);
    result3 = ClosestPair.init3D(graphics, 25/*points*/, 10/*grid size*/);
    ClosestPair.makeButtons(result3.al, "#tab0 .menu");
    console.log(result3);

    jQuery("#tabList #link1 a").click(function (e){
        result3.g.redraw = function(){};
        result3 = null;
        for(var i = 0;i < graphics.scene.children.length;i++){
            graphics.scene.remove(graphics.scene.children[i]);
        }
        jQuery("#tab0 .canvas").html();
        jQuery("#tab0 .menu").html();

        jQuery("#tab1 .canvas").html(graphics.renderer.domElement);
        result2 = ClosestPair.init2D(graphics, 25/*points*/, 10/*grid size*/);
        ClosestPair.makeButtons(result2.al, "#tab1 .menu");
    });

    jQuery("#tabList #link0 a").click(function (e){
        result2.g.redraw = function(){};
        result2 = null;
        for(var i = 0;i < graphics.scene.children.length;i++){
            graphics.scene.remove(graphics.scene.children[i]);
        }
        jQuery("#tab1 .canvas").html();
        jQuery("#tab1 .menu").html();

        jQuery("#tab0 .canvas").html(graphics.renderer.domElement);
        result3 = ClosestPair.init3D(graphics, 25/*points*/, 10/*grid size*/);
        ClosestPair.makeButtons(result3.al, "#tab1 .menu");
    });

};
