---
---

/*jslint white: false, plusplus: false, onevar: false, browser: true,
 nomen: false, eqeqeq: false */
var sqrt = Math.sqrt,
    cos = Math.cos,
    sin = Math.sin,
    abs = Math.abs,
    log = Math.log,
    random = Math.random,
    PI = Math.PI,
    floor = Math.floor,
    FPSCounter, // make jslint happy;
    NSTARS = 5000,
    STARSIZE = 5,
    FPSCounter = Engine.FPSCounter,
    ResourceLoader = Engine.ResourceLoader;

function assert(condition) {
    if(!condition) {
        throw Error('Assertion error');
    }
}

function V3(x, y, z) {
    assert(x != NaN && y != NaN && z != NaN);
    this.x = x;
    this.y = y;
    this.z = z;
}
V3.prototype = {
    // iop -> inplace
    // ops -> scalar
    add: function(v) {
        return new V3(this.x+v.x, this.y+v.y, this.z+v.z);
    },
    iadd: function(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
    },
    sub: function(v) {
        return new V3(this.x-v.x, this.y-v.y, this.z-v.z);
    },
    isub: function(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
    },
    mul: function(v) {
        return new V3(this.x*v.x, this.y*v.y, this.z*v.z);
    },
    div: function(v) {
        return new V3(this.x/v.x, this.y/v.y, this.z/v.z);
    },
    muls: function(s) {
        return new V3(this.x*s, this.y*s, this.z*s);
    },
    imuls: function(s) {
        assert(s != NaN);
        this.x *= s;
        this.y *= s;
        this.z *= s;
    },
    divs: function(s) {
        return this.muls(1.0/s);
    },
    dot: function(v) {
        return this.x*v.x+this.y*v.y+this.z*v.z;
    },
    cross: function(v) {
        return new V3(
            this.y*v.z-this.z*v.y,
            this.z*v.x-this.x*v.z,
            this.x*v.y-this.y*v.x);
    },
    normalize: function(){
        var s = 1.0/sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
        return new V3(this.x*s, this.y*s, this.z*s);
    },
    magnitude: function(){
        return sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
    },
    magnitude2: function(){
        return this.x*this.x+this.y*this.y+this.z*this.z;
    },
    copy: function(){
        return new V3(this.x, this.y, this.z);
    }
};

function M4x4() {
    for(var i = 0; i < 16; i++) {
        assert(arguments[i] != NaN);
        this[i] = arguments[i];
    }
}
M4x4.prototype = {
    mul4x4: function(m) {
        var result = [],
            resultmatrix = new M4x4;
        for(var row = 0; row < 4; row++) {
            for(var col = 0; col < 4; col++) {
                var x = 0;
                for(var i = 0; i < 4; i++) {
                    x += this[row*4+i]*m[i*4+col];
                }
                result.push(x);
            }
        }
        M4x4.apply(resultmatrix, result);
        return resultmatrix;
    }
};


// like glFrustum left, right, bottom, top, near, far
function Camera(l, r, b, t, n, f) {
    // again this is just like it is in opengl (I think)
    this.frustum = new M4x4(
        2*n/(r-l), 0, (r+l)/(r-l), 0,
        0, 2*n/(t-b), (t+b)/(t-b), 0,
        0, 0, -(f+n)/(f-n), -2*f*n/(f-n),
        0, 0, -1, 0
    );
}
Camera.prototype = {
    lookAt: function(eye, center, up) {
        var f = center.sub(eye).normalize(),
            s = f.cross(up).normalize(),
            u = s.cross(f),
            m1 = new M4x4(
                s.x, s.y, s.z, 0,
                u.x, u.y, u.z, 0,
                -f.x, -f.y, -f.z, 0,

                0, 0, 0, 1
            ),
            eye_ = eye.muls(-1),
            m2 = new M4x4(
                1, 0, 0, eye_.x,
                0, 1, 0, eye_.y,
                0, 0, 1, eye_.z,
                0, 0, 0, 1
            );
        this.eye = eye;
        this.projection = this.frustum.mul4x4(m1).mul4x4(m2);
    },
    project: function(v) {
        // important: this function assumes v to be a point, now a direction
        // as it assumes w to be 1
        var p = this.projection;
        var w = 1/(p[12]+v.x + p[13]*v.y + p[14]*v.z + p[15]);
        return {
            x: (p[0]*v.x + p[1]*v.y + p[2]*v.z + p[3])*w,
            y: (p[4]*v.x + p[5]*v.y + p[6]*v.z + p[7])*w
        };
    }
};


function Star(x, y, z, mass, sprite) {
    V3.call(this, x, y, z);
    this.mass = mass;
//    this.sprite = sprite;
}
Star.prototype = V3.prototype;

function Galaxy(skymap, nstars, nsprites) {
    this.stars = [];
    this.skymap = skymap;
    var x=1, y=1;
    while(nstars--){
        do {
            x = random()*2-1;
            y = random()*2-1;
        } while( x*x + y*y > random()*0.3);
        var z = log(random()) * (random() > 0.5 ? 0.1 : -0.1),
            mass = random()+1.0,
            sprite = floor(random()*nsprites);
        this.stars.push(
            new Star(x,
                z*0.1,
                y,
                mass,
                sprite));
    }
}
Galaxy.prototype = {
    tick: function(td) {
        var alpha = td*0.05,
            i = this.stars.length;
        while(i--) {
            var star = this.stars[i],
                a = alpha*(1.10-this.skymap.getSpeed(star.x, star.z))*star.mass,
                sin_ = sin(a),
                cos_ = cos(a);
            star.x = star.x * cos_ - star.z * sin_;
            star.z = star.z * cos_ + star.x * sin_;
        }
    }
};

function getDataFromImage(img) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0 ,0);
    return ctx.getImageData(0, 0, img.width, img.height);
}

function SkyMap(img){
    img = getDataFromImage(img);
    this.width = img.width;
    this.height = img.height;
    this.speed = [];
    for(var d=img.data, i = 0, l=d.length; i < l; i+=4){
        this.speed.push(d[i]/255);
    }
}
SkyMap.prototype = {
    getSpeed: function(x, y) {
        var i = floor((x+1)*this.width*0.5) + floor((y+1)*this.height*0.5)*this.width;
        return this.speed[i];
    }
};

function Renderer(canvas, galaxy, stars) {
    this.canvas = canvas;
    this.stars = stars;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera(-1, 1, -1, 1, 3, 100);
    var center = new V3(0.0, 0.0, 0.0);
    var eye = new V3(0.0, 4.0, 0.0);
    var up = center.sub(eye).normalize().cross(new V3(1.0, 0.00001, 0.00001)).normalize();
    this.camera.lookAt(eye, center, up);
    this.galaxy = galaxy;
    this.width = canvas.width;
    this.height = canvas.height;
    this.fps = new FPSCounter(this.ctx);
}
/** Edit by D. Wysocki
 *
 * I have edited the original source of the Renderer, such that the background
 * is white, and the stars are black, in order to match the colors of my
 * webpage. I have left the original code commented out, followed by my
 * additions, with the text "D. Wysocki edit".
 */
Renderer.prototype = {
    render: function() {
        var ctx = this.ctx,
            w = this.width,
            h = this.height,
            stars = this.galaxy.stars,
            i = stars.length;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.8;
        /**
        ctx.fillStyle = 'black';
        **/
        ctx.fillStyle = 'white'; // D. Wysocki edit
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1.0;
        /**
        ctx.fillStyle = 'rgba(180, 180, 255, 0.6)';
        ctx.globalCompositeOperation = 'lighter';
        **/
        ctx.fillStyle = 'black'; // D. Wysocki edit
        this.fps.draw();
        ctx.save();
        ctx.translate(w*0.5, h*0.5);
        ctx.scale(w, w);
        while(i--) {
            var star = stars[i],
                p = this.camera.project(star),
                // I should be able to get this out of the z component
                // of the projection, but I'm too stupid right now
                size = star.mass*STARSIZE/star.sub(this.camera.eye).magnitude()/w;
            //ctx.beginPath();
            //ctx.drawImage(img, p.x, p.y, size, size);
            ctx.fillRect(p.x, p.y, size, size);
            //ctx.arc(p.x, p.y, size, 0, PI * 2, true);
            //ctx.fill();
        }
        ctx.restore();
    }
};

function main(canvas, resources) {
    var skymap = new SkyMap(resources.skymap),
        stars = [resources.stars0, resources.stars1, resources.stars2, resources.stars3, resources.dust],
        galaxy = new Galaxy(skymap, NSTARS, stars.length),
        renderer = new Renderer(canvas, galaxy, stars);
    var tx = 0.0;
    setInterval(function(){
        tx += 0.01;
        galaxy.tick(0.2);
        var center = new V3(0.0, 0.0, 0.0);
        var eye = new V3(Math.sin(tx)*4, 2.0, Math.cos(tx)*4);
        var up = center.sub(eye).normalize().cross(new V3(1.0, 0.000001, 0.000001)).normalize();
        up = new V3(0.0, 1.0, 0.0);
        renderer.camera.lookAt(eye, center, up);
        renderer.render();
    }, 50);
}

function init() {
    var canvas = document.createElement('canvas');
    canvas.width = 320*2;
    canvas.height = 240*2;
    document.body.appendChild(canvas);
    var resources = new ResourceLoader([
            ['img', 'skymap', '{{site.baseurl}}/404/sky.png']
/*            ['img', 'dust', 'dust.png'],
            ['img', 'stars0', 'stars0.png'],
            ['img', 'stars1', 'stars1.png'],
            ['img', 'stars2', 'stars2.png'],
            ['img', 'stars3', 'stars3.png']*/
        ],
        function() {
            main(canvas, resources);
        },
        function() {
            alert('could not load all the resources');
        }
    );
}
init();
