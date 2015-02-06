ClosestPair.POINT_COUNT = 10;

ClosestPair.setup = (function(){
    function random(size){
        /*  Generate random number between -size and size
         *  (double) -> double
         */
        return Math.floor((Math.random() * 2 - 1) * size * 1000) / 1000;
    }

    function generalSetup(graphics, points, rotate){
        /*  Connect the graphics to the logic
         *  ({scene: THREE.Scene, camera: THREE.PersectiveCamera, renderer: THREE.WebGLRenderer}, array of THREE.Vector3) ->
         */
        // Parameter check
        if(rotate === undefined){
            rotate = true;
        }

        // Variable declaration
        var renderBox = new THREE.Object3D();
        var pointObjects = {};

        // For each point create a graphical representation
        for(var i = 0;i < points.length;i++){
            var point = visualisations.vector2Point(points[i]);
            points[i].ptr = point;
            pointObjects[point.uuid] = point;
            renderBox.add(point);
        }

        // Add renderbox to scene
        graphics.scene.add(renderBox);

        // Setup the redraw function
        if(rotate){
            graphics.redraw = function(){
                renderBox.rotation.y += 0.01;
                graphics.renderer.render(graphics.scene, graphics.camera);
                visualisations.requestAnimationFrame(graphics.redraw);
            };
        }else{
            graphics.redraw = function(){
                graphics.renderer.render(graphics.scene, graphics.camera);
                visualisations.requestAnimationFrame(graphics.redraw);
            };
        }

        // Call it
        graphics.redraw();

        // Find the closest pair
        var result = ClosestPair.algorithm(points, pointObjects);

        // Add animation list rendering to renderBox
        renderBox.add(result.animationList.g);

        // Return result
        return {
            renderBox: renderBox,
            pointObjects: pointObjects,
            animationList: result.animationList,
            result: result.result,
        };
    }

    return {
        init: generalSetup,
        demo3D: function(graphics, pointsCount, size){
            /*  Generate 3D points for demonstration
             *  ({scene: THREE.Scene, camera: THREE.PersectiveCamera, renderer: THREE.WebGLRenderer}, integer, double) ->
             */
            var points = [];
            for(var i = 0;i < pointsCount;i++){
                points.push(new THREE.Vector3(
                    random(size),
                    random(size),
                    random(size)
                ));
            }
            return generalSetup(graphics, points, true);
        },
        demo2D: function(graphics, pointsCount, size){
            /*  Generate 2D points for demonstration
             *  ({scene: THREE.Scene, camera: THREE.PersectiveCamera, renderer: THREE.WebGLRenderer}, integer, double) ->
             */
            var points = [];
            for(var i = 0;i < pointsCount;i++){
                points.append(new THREE.Vector3(
                    random(size),
                    random(size),
                    0
                ));
            }
            return generalSetup(graphics, points, false);
        },
    };
})();

ClosestPair.init = function(graphics){
    /*
     *  ({scene: THREE.Scene, camera: THREE.PersectiveCamera, renderer: THREE.WebGLRenderer}) -> null 
     */

    // Array of tab names
    var tabNames = ["3D Demonstration", "2D Demonstration", "Code Sample"];

    // Clear out content
    var tabList = jQuery("#tabList").html("");
    var tabContent = jQuery("#tabContent").html("");

    // Create each tab
    for(var i = 0;i < tabNames.length;i++){
        var listItem = jQuery("<li id=\"link" + i + "\" class=\"" + (i == 0 ? "active" : "") + "\"></li>");
        jQuery("<a href=\"#tab" + i + "\" data-toggle=\"tab\">" + tabNames[i] + "</a>").appendTo(listItem);

        var div = jQuery("<div class=\"tab-pane fade" + (i == 0 ? " active in" : "") + "\" id=\"tab" + i + "\">");
        if(i == 0 || i == 1){
            jQuery("<div class=\"canvas\" style=\"float: left;width: 600px;height: 600px\"></div>").appendTo(div);
            jQuery("<div class=\"menu\" style=\"float: right;\"></div>").appendTo(div);
        }

        listItem.appendTo(tabList);
        div.appendTo(tabContent);
    }

    // Get the jQuery object of all the elements needed
    var canvas = jQuery(".canvas-home canvas");
    var demo3D = jQuery("#tab0 .canvas");
    var demo2D = jQuery("#tab0 .canvas");

    // Move the graphics object to the 3D demo first
    canvas.detach().appendTo(jQuery("#tab0 .canvas"));
    var result = ClosestPair.setup.demo3D(graphics, ClosestPair.POINT_COUNT /*pointCount*/, 7.2 /*size of containing box*/);

    jQuery("<button class=\"glyphicon glyphicon-step-backward\" aria-hidden=\"true\" \>").click(function(){
        result.animationList.prevAnimation();
    }).appendTo(".menu");

    jQuery("<button class=\"glyphicon glyphicon-step-forward\" aria-hidden=\"true\" \>").click(function(){
        result.animationList.nextAnimation();
    }).appendTo(".menu");

    jQuery("#tabList #link1 a").click(function (e){
        // Move canvas to 2D demo
        canvas.detach().appendTo(demo2D);

        // Clear out the previous demo's elements
        demo3D.html();
        jQuery("#tab0 .menu").html();


        /*result3.g.redraw = function(){};
        result3 = null;
        for(var i = 0;i < graphics.scene.children.length;i++){
            graphics.scene.remove(graphics.scene.children[i]);
        }*/

        /*jQuery("#tab1 .canvas").html(graphics.renderer.domElement);
        result2 = ClosestPair.init2D(graphics, 25/*points*///, 10/*grid size*/);
        //ClosestPair.makeButtons(result2.al, "#tab1 .menu");
    });


};

