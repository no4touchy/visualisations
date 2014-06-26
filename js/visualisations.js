window.visualisations = (function(){
    
    function ActivityQueue(){
        this.head = null;
        this.tail = null;
        this.current = null;
        
        this.play = false;
        this.timeout = 800;
        this.resetFunc = function(){};
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
        reset: function(){
            this.current = this.head;
            this.play = false;
            window.setTimeout(this.resetFunc, 500);
        },
        executeSingle: function(){
            var obj = {func:function(data){return;},data:null,};
            if(this.current === null){
                this.current = this.head;
            }
            if(this.current !== null){
                obj = this.current;
                this.current = obj.next;
            }
            return obj.func(obj.data);
        },
        executeContinous: function(){
            var that = this;
            this.play = true;
            var func = function(){
                if(that.play){
                    try{
                        that.executeSingle();
                    }catch(err){
                        return err;
                    }
                    window.setTimeout(func, that.timeout);
                }
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
