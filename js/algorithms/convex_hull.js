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

        // Find lower_tangent
        action = true;
        lower_tangent = [a, b];
        while(action){
            action = false;
			// Check H_a clockwise
            while(point_below_line(lower_tangent, lower_tangent[0].prev)){
                lower_tangent[0] = lower_tangent[0].prev;
                action = true;
            }
			// Check H_b counter-clockwise
            while(point_below_line(lower_tangent, lower_tangent[1].next)){
                lower_tangent[1] = lower_tangent[1].next;
                action = true;
            }
        }

        // Find upper_tangent
        action = true;
        upper_tangent = [a, b];
        while(action){
            action = false;
			// Check H_a counter-clockwise
            while(!point_below_line(upper_tangent, upper_tangent[0].next)){
                upper_tangent[0] = upper_tangent[0].next;
                action = true;
            }
			// Check H_b clockwise
            while(point_below_line(upper_tangent, upper_tangent[1].prev)){
                upper_tangent[1] = upper_tangent[1].prev;
                action = true;
            }
        }
		
		// Stitch tangents together
		upper_tangent[0].prev = upper_tangent[1];
		upper_tangent[1].next = upper_tangent[0];
		lower_tangent[0].next = lower_tangent[1];
		lower_tangent[1].prev = lower_tangent[0];

        // Merge and return
		return H_b;
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
			if(points.length == 2){ // The simple case
				points[2].next = points[1];
				points[2].prev = points[1];
				points[1].next = points[2];
				points[1].prev = points[2];
			}else if(){ // The not so simple case
				var max_point = (points[0].y < points[1].y) ? 1 : 0;
				var min_point = 1 - max_point;
				
				// Connect last with max_point
				points[3].next = points[max_point];
				points[max_point].prev = points[3];
				
				// Connect max_point to min_point
				points[max_point].next = points[min_point];
				points[min_point].prev = points[max_point];
				
				// Connect min_point to last
				points[min_point].next = points[3];
				points[3].prev = points[min_point];
			}
			
            // Return head point, the rightmost point
            return points[points.length - 1];
        }

        // Split points into 2 seperate parts
        var m = Math.round(points.length / 2);
        var points_a = points.slice(0, m);
        var points_b = points.slice(m);

        // Recursively call function
        var H_a = find_convex_hull_2D(points_a);
        var H_b = find_convex_hull_2D(points_b);

        // Merge
        var H = merge_convex_hull_2D(H_a, H_b);
    
		// Return convex hull
		return H;
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
        var CH = find_convex_hull_2D(spoints);
    }

    return {};
});
