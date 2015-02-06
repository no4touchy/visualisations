window.visualisations = (function () {
    
    var POINT_SIZE = 0.2;
    var POINT_GEOMETRY = new THREE.SphereGeometry(POINT_SIZE);//new THREE.BoxGeometry(POINT_SIZE, POINT_SIZE, POINT_SIZE);
    
    function AnimationList () {
        /** () -> visualisations.AnimationList
         *  Constructs a new animation queue
         *  O(1) time
        **/
        // Linked list properties
        this.headAnimation = null;
        this.tailAnimation = null;
        this.currentAnimation = null;
        this.animationCount = 0;
        this.reachedEnd = true;
        // Graphics object
        this.g = new THREE.Object3D();
        // Playing properties
        this.timeout = 800;
        this.playing = false;
        this.finishCallback = AnimationList.noop;
    }
    AnimationList.noop = function () {};
    AnimationList.Animation = function (build, destroy, next, previous) {
        /** (functions, function[, visualisations.AnimationList.Animation[, visualisations.AnimationList.Animation]]) -> visualisations.AnimationList.Animation
         *  Builds an Animation
         *  O(1) time
        **/
        // Set animation functions
        this.buildAnimation = build;
        this.destroyAnimation = destroy;
        // Set linked list navigation pointers
        this.next = next !== undefined ? next : null;
        this.previous = previous !== undefined ? previous : null;
    },
    AnimationList.prototype = {
        constructor: AnimationList,
        addAnimation: function(build, destroy) {
            /** (function, function) -> null
             *  Add new animation node to list
             *  O(1) time
            **/
            animation = new AnimationList.Animation(build, destroy);
            if(this.headAnimation !== null) {
                this.tailAnimation.next = animation;
                animation.previous = this.tailAnimation;
                this.tailAnimation = animation;
                this.reachedEnd = false;
            }else{
                this.headAnimation = animation;
                this.tailAnimation = animation;
                this.currentAnimation = animation;
            }
            this.animationCount++;
        },
        nextAnimation: function() {
            /** () -> boolean
             *  Play a single animation forward sequence. Return false if its the last animation, else return true.
             *  O(1) time
            **/
            if(this.currentAnimation === null){
                return false;
            }
            this.currentAnimation.buildAnimation(this.g);
            if(this.tailAnimation === this.currentAnimation) {
                this.reachedEnd = true;
                this.finishCallback();
                return false;
            }
            this.currentAnimation = this.currentAnimation.next;
            return true;
        },
        previousAnimation: function() {
            /** () -> boolean
             *  Play a single animation backward sequence. Return false if its the first animation, else return true.
             *  O(1) time
            **/
            if(this.currentAnimation === null){
                return false;
            }
            if(this.headAnimation === this.currentAnimation) {
                return false;
            }
            if(!this.reachedEnd){
                this.currentAnimation = this.currentAnimation.previous;
            }else{
                this.reachedEnd = false;
            }
            this.currentAnimation.destroyAnimation(this.g);
            return true;
        },
        nextAnimationLoop: function(firstFlag) {
            /** () -> Null
             *  Starts the animatin loop.
             *  O(1) time, for this function call only
            **/
            var timeout = this.timeout;
            var that = this;
            if(firstFlag === undefined) {
                timeout = 0;
                that.playing = true;
            }
            window.setTimeout(function() {
                if(that.playing && that.nextAnimation()) {
                    that.nextAnimationLoop(false);
                }else {
                    that.playing = false;
                }
            }, timeout);
        },
        previousAnimationLoop: function(firstFlag) {
            /** () -> Null
             *  Starts the backward animation loop.
             *  O(1) time, for this function call only
            **/
            var timeout = this.timeout;
            var that = this;
            if(firstFlag === undefined) {
                timeout = 0;
                that.playing = true;
            }
            window.setTimeout(function() {
                if(that.playing && that.previousAnimation()) {
                    that.previousAnimationLoop(false);
                }else {
                    that.playing = false;
                }
            }, timeout);
        },
    };
    
    function threeSetup (selector) {
        /** (string) -> Object containing THREE.js constructs
         *  Builds a THREE.js context at `selector`,
         *  O(1) time
         */
        var $el = jQuery(selector);
        var WIDTH = $el.width(),
            HEIGHT = $el.height();console.log(HEIGHT + "x" + WIDTH);
        /* --- ThreeJS setup --- */    
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(75., WIDTH / HEIGHT, 0.1, 1000.);
        var renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        camera.position.z = 30;
        renderer.setSize(WIDTH, HEIGHT);
        $el.append(renderer.domElement);
        
        return {
            scene: scene,
            camera: camera,
            renderer: renderer,
        };
    }
    
    var requestAnimationFrame = (function(){
        return  window.requestAnimationFrame        ||
                window.webkitRequestAnimationFrame  ||
                window.mozRequesstAnimationFrame    ||
                window.oRequestAnimationFrame       ||
                window.msRequestAnimationFrame      ||
                function(callback){
                    return window.setTimeout(callback, 1000 / 60);
                };
    })().bind(window);
    
    function vectors2Line (vectors, material) {
        /** (array of 2 THREE.Vector3[, THREE.LineBasicMaterial]) -> THREE.Line
         *  Create a new line with the given vectors, and optionaly a material.
         *  O(1) time
         */
        material = material !== undefined ? material.clone() : new THREE.LineBasicMaterial({color: 0x0000ff});
        var line = new THREE.Line(new THREE.Geometry(), material);
        line.geometry.vertices = vectors;
        return line;
    }
    
    function vector2Point (vector, material, geometry) {
        /** (THREE.Vector3[, THREE.MeshBasciMateria[, THREE.Geometry]]) -> THREE.Mesh
         *  Creates a point centered at `vector`.
         * O(1) time
         */
        material = material !== undefined ? material.clone() : new THREE.MeshBasicMaterial({color: 0x000000});
        geometry = geometry !== undefined ? geometry : POINT_GEOMETRY;
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position = vector;
        return mesh;
    }
    
    function boundingBox2Mesh (boundingBox, color){
        /** (THREE.Box3, integer) -> THREE.Mesh
         *  Create a mesh for the bounding box.  
         *  O(1) time
        **/
        var material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.25,
        });
        var lengths = new THREE.Vector3(
            Math.abs(boundingBox.max.x - boundingBox.min.x),
            Math.abs(boundingBox.max.y - boundingBox.min.y),
            Math.abs(boundingBox.max.z - boundingBox.min.z)
        );
        var geometry = new THREE.BoxGeometry(lengths.x, lengths.y, lengths.z);
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.add(lengths);
        mesh.position.divideScalar(2);
        mesh.position.add(boundingBox.min);
        return mesh;
    }
    
    function objectInArray(object, array){
        for(var i = 0;i < array.length;i++){
            if(array[i] === object){
                return true;
            }
        }
        return false;
    }
    
    function cloneObject(dest, source){
        for(var attr in dest){
            if(!(attr in source)){
                delete dest[attr];
            }
        }
        for(var attr in source){
            dest[attr] = source[attr];
        }
    }
    
    return {
        threeSetup: threeSetup,
        requestAnimationFrame: requestAnimationFrame,
        vectors2Line: vectors2Line,
        vector2Point: vector2Point,
        boundingBox2Mesh: boundingBox2Mesh,
        
        objectInArray : objectInArray,
        cloneObject: cloneObject,
        
        AnimationList: AnimationList,
    };
})();
