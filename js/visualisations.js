window.visualisations = (function(){
    
    function ActivityQueue(){
        this.head = null;
        this.tail = null;
    }
    ActivityQueue.prototype = {
        constructor: ActivityQueue,
        enqueue: function(func, data){
            var obj = {
                func: func,
                data: data,
                prev: null,
                next: null,
            };
            if(this.tail === null){
                this.head = obj;
                this.tail = obj;
            }else{
                this.tail.next = obj;
                obj.prev = this.tail;
                this.tail = obj;
            }
        },
        dequeue: function(){
            var result = null;
            if(this.head === null){
                throw "No items in ActivityQueue!";
            }
            if(this.head.next === null){
                result = this.head;
                this.head = null;
                this.tail = null;
            }else{
                result = this.head;
                this.head = this.head.next;
                result.next = null;
                this.head.prev = null;
            }
            return result;
        },
        executeSingle: function(){
            var obj = this.dequeue();
            return obj.func(obj.data);
        },
        executeContinous: function(timeout){
            if(timeout === undefined){
                timeout = 800;
            }
            var that = this;
            var func = function(){
                var obj = null;
                try{
                    that.executeSingle()
                }catch(err){
                    return err;
                }
                window.setTimeout(func, timeout);
            };
            func();
        },
    };
    
    function threeSetup(selector){
        var $el = jQuery(selector);
        var WIDTH = $el.width(),
            HEIGHT = $el.height();
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
    
    return {
        ActivityQueue: ActivityQueue,
        threeSetup: threeSetup,
    };
})();
