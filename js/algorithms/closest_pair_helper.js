ClosestPair.POINT_COUNT = 6;

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
        while(graphics.scene.children.length > 0){
            graphics.scene.remove(graphics.scene.children[0]);
        }
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
                points.push(new THREE.Vector3(
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

    jQuery("#pageContent").load("html/closest_pair.html", function(){

        // Get the jQuery object of all the elements needed
        var canvas = jQuery(".canvas-home canvas");
        var demo3D = jQuery("#3d-tab");
        var demo2D = jQuery("#2d-tab1");

        var result = null;

        // Construct AnimationList play menu
        var makeMenus = function(result, tab){
            jQuery("<button class=\"glyphicon glyphicon-step-backward\" aria-hidden=\"true\" \>").click(function(){
                result.animationList.previousAnimation();
            }).appendTo(tab.find(".menu"));
            var play = true;
            jQuery("<button class=\"glyphicon glyphicon-play\" aria-hidden=\"true\">").click(function() {
                if(play) {
                    play = false;
                    jQuery(this).removeClass("glyphicon-play").addClass("glyphicon-pause");
                    result.animationList.nextAnimationLoop();
                } else {
                    play = true;
                    jQuery(this).addClass("glyphicon-play").removeClass("glyphicon-pause");
                    result.animationList.playing = false;
                }
            }).appendTo(tab.find(".menu"));
            jQuery("<button class=\"glyphicon glyphicon-step-forward\" aria-hidden=\"true\" \>").click(function(){
                result.animationList.nextAnimation();
            }).appendTo(tab.find(".menu"));
            jQuery(tab.find(".menu")).append("<br />");
        }

        jQuery("#tabList #link0 a").click(function (e){
            // Move the graphics object to the 3D demo first
            canvas.detach().appendTo(demo3D.find(".canvas"));
            result = ClosestPair.setup.demo3D(graphics, ClosestPair.POINT_COUNT /*pointCount*/, 7.2 /*size of containing box*/);

            demo2D.find(".menu").html("");
            makeMenus(result, demo3D);
        });

        jQuery("#tabList #link1 a").click(function (e){
            // Move canvas to 2D demo
            canvas.detach().appendTo(demo2D.find(".canvas"));
            result = ClosestPair.setup.demo2D(graphics, ClosestPair.POINT_COUNT /*pointCount*/, 7.2 /*size of containing box*/);

            // Clear out the previous demo's elements
            demo3D.find(".menu").html("");
            makeMenus(result, demo2D);
        });

        jQuery("#tabList #link0 a").click();
    });

};

