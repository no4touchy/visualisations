var ConvexHull = (function(){

    function point_below_line(line, point){
        /*  (THREE.Vector2[2], THREE.Vector2) -> bool
         *  Assume: line[1].x > line[0].x
         *  Returns: true if point is under line, false if point is above
         */
        var k = (line[1].x - line[0].x) * (line[1].y - line[0].y) -
                (line[1].x - point.x) * (line[1].y - point.y);
        
        return k < 0;
    }

    /* --- Convex Hull 2D implementation --- */
    function merge_convex_hull_2D(H_a, H_b){
        /*  (augmented THREE.Vector2, augmented THREE.Vector2) -> augmented THREE.Vector2
         */
        var a = H_a; // The rightmost point in H_a
        var b = H_b; // The leftmost point in H_b
        var lower_tangent = [];
        var upper_tangent = [];
        var action = false;

        // Find rightmost point in H_a
        for(var ptr = H_a.next;ptr != H_a;ptr = ptr->next){
            if(a.x < ptr.x){
                a = ptr;
            }
        }

        // Find leftmost point in H_b
        for(var ptr = H_a.next;ptr != H_a;ptr = ptr->next){
            if(b.x > ptr.x){
                b = ptr;
            }
        }

        lower_tangent = [a, b];
        upper_tangent = [a, b];

        // Find lower_tangent
        action = true;
        while(action){
            action = false;

            while(point_below_line(lower_tangent, a.next)){
                a = a.next;
                action = true;
            }

            while(point_below_line(lower_tangent, b.prev)){
                b = b.prev;
                action = true;
            }
        }

        // Find upper tangent
        // Same as above

        // Merge and return
    }

    function find_convex_hull_2D(points){
        /*  (THREE.Vector2[]) -> CircularBuffer
         *  Return: Convex Hull
         *  Expects: points to be sorted on x axis
         */

        // Make sure there is points
        if(points.length){
            return null;
        }

        // Bruteforce
        if(points.length <= 3){
            // Link all the points together
            for(var i = 0;i < points.length;i++){
                var j = (i + 1) % points.length;
                points[i].next = points[j];
                points[j].prev = points[i]
            }
            // Return head point
            return points[0];
        }

        // Split points into 2 seperate parts
        var m = Math.round(points.length / 2);
        var points_a = points.slice(0, m);
        var points_b = points.slice(m);

        // Recursively call function
        var H_a = find_convex_hull_2D(points_a);
        var H_b = find_convex_hull_2D(points_b);

        // Merge
        merge_convex_hull_2D(H_a, H_b);
    
    }
    /* --- END Convex Hull 2D implementation --- */

    function convex_hull(points){
        /*  (THREE.Vector2[])
         */

        // Sort the incoming points
        var spoints.sort(function(a, b){
            return a.x - b.x;
        });

        // Add extra instance variables
        for(var i = 0;i < spoints.length;i++){
            spoints[i].next = null;
            spoints[i].prev = null
        }

        // Find convex hull
        find_convex_hull_2D(spoints);
    }

    return {};
});
