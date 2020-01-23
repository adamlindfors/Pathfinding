
let camera, scene, renderer, controls;
var actorCount = 3;
var actorRadius;
var actors = [];
let then = 0;
let epsilon = 0.9;
var walkabilityMatrix, finder, grid, mx;
var model, neck, waist, possibleAnims, mixer, idle;
var playAnimation, gridCreated = false;
var loaderAnim = document.getElementById('js-loader');
var raycaster, mouse, intersects;
var tileGeometry;
var MAX_SEE_AHEAD = 3;
var MAX_AVOID_FORCE = 2;

function init() {
	// Init scene
	scene = new THREE.Scene();

	const MODEL_PATH = 'https://threejs.org/examples/models/gltf/Soldier.glb';


	// Init camera (PerspectiveCamera)
	camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);

	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();


	let stacy_txt = new THREE.TextureLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg');

	stacy_txt.flipY = false;

	const stacy_mtl = new THREE.MeshPhongMaterial({
  map: stacy_txt,
  color: 0xffffff,
  skinning: true
	});

	var loader = new THREE.GLTFLoader();

	loader.load(
	MODEL_PATH,
	function(gltf) {
		model = gltf.scene;
		let fileAnimations = gltf.animations;

		model.traverse(o => {
  		if (o.isMesh) {
    	o.castShadow = true;
    	o.receiveShadow = true;
  	}
});
		loaderAnim.remove();
		var animations = gltf.animations;
		for(i = 0; i < actorCount; i++) {
			actors[i] = new actor();
			actors[i].model = cloneGltf(gltf).scene;
			actors[i].mixer = new THREE.AnimationMixer(actors[i].model);
			idleAction = actors[i].mixer.clipAction( animations[ 0 ] );
			walkAction = actors[i].mixer.clipAction( animations[ 3 ] );
			runAction = actors[i].mixer.clipAction( animations[ 1 ] );
			actions = [ idleAction, walkAction, runAction ];
			actors[i].actions = actions;
		}
		spawnActors();
	},
	undefined,
	function(error) {
		console.log(error)
	});

	// Lights
  var light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set( 0, 60, 5 );
  light.rotation.x = -60 * Math.PI / 180;
  light.rotation.y = -20 * Math.PI / 180;
	var ambLight = new THREE.AmbientLight( 0x404040 ); // soft white light

	// Init renderer
	renderer = new THREE.WebGLRenderer({ antialias: true });

	controls = new THREE.OrbitControls( camera, renderer.domElement );

	camera.position.set( 0, 30, 15 );
	camera.rotation.x = -45 * Math.PI / 180;
	controls.update();

	// Set size (whole window)
	renderer.setSize(window.innerWidth, window.innerHeight);

	// Render to canvas element
	document.body.appendChild(renderer.domElement);

	//Planes
  var planeGeometry = new THREE.PlaneGeometry( 20, 20, 1, 1 );
  var planeMaterial = new THREE.MeshPhongMaterial( {
		color: 0xFFFFFF,
		side: THREE.DoubleSide,
		opacity: 0.2,
		transparent: true} );

  var floor = new THREE.Mesh( planeGeometry, planeMaterial );
  var left = new THREE.Mesh( planeGeometry, planeMaterial );
  var right = new THREE.Mesh( planeGeometry, planeMaterial );
  var front = new THREE.Mesh( planeGeometry, planeMaterial );
  var back = new THREE.Mesh( planeGeometry, planeMaterial );

	floor.rotation.x = 90 * Math.PI / 180;
  floor.position.z = -10;
	floor.position.y = -5;

	front.rotation.z = 90 * Math.PI / 180;
	front.position.z = 0;
	front.position.y = 10;

	back.rotation.z = 90 * Math.PI / 180;
  back.position.z = -20;
	back.position.y = 10;

	left.rotation.y = 90 * Math.PI / 180;
	left.position.z = -10;
	left.position.x = -10;
	left.position.y = 10;

	right.rotation.y = 90 * Math.PI / 180;
	right.position.z = -10;
	right.position.x = 10;
	right.position.y = 10;

  scene.add(light, ambLight, floor, right, left, front, back);
}

function spawnActors() {
	actorRadius = 0.2;
	grid = new grid(20, 20);
  const actorGeometry = new THREE.CylinderGeometry( actorRadius, actorRadius, 0.1, 32 );
  const actorMaterial = new THREE.MeshPhongMaterial({ color: 0xff00d4, side: THREE.DoubleSide});

	tileGeometry = new THREE.PlaneGeometry( 0.9, 0.9, 1 );
	const tileMaterial = new THREE.MeshPhongMaterial({ color: 0xfffec4 });


	grid.init(tileGeometry, tileMaterial);
  for(var i = 0; i < actorCount; i++) {
		actors[i].path = [];
    actors[i].velocity = new THREE.Vector3(0,0,0);

		actors[i].actions[0].weight = 0.1;
		actors[i].actions[2].weight = 0;

			scene.add(actors[i].model);

  }
	for(i = 0; i < grid.grid.length; i++) {
		grid.grid[i].mesh.rotation.x = -90 * Math.PI / 180;
		scene.add(grid.grid[i].mesh);
	}
}

// Draw the scene every time the screen is refreshed
function animate(now) {
	if(model !== undefined) {
		now *= 0.001;
		const delta = now - then;
		then = now;
		controls.update();

	document.addEventListener("keydown", onDocumentKeyDown, false);

	raycaster.setFromCamera( mouse, camera );
	intersects = raycaster.intersectObjects( scene.children );
	//console.log(intersects[0].object);

	function onDocumentKeyDown(event) {
	    var keyCode = event.which;
	    if (keyCode == 75) {
	        camera.position.set(0,15,-10);
					controls.target.set(0,0,-10);
					controls.enabled = false;
	    }
			else if (keyCode == 74) {
				camera.position.set(0, 30, 15);
				controls.target.set(0,0,0);
				controls.enabled = true;
			}
			else if(keyCode == 32) {
				playAnimation = true;
			}
	};
	if(playAnimation) {
		if(!gridCreated) {

			const tileMaterialStart = new THREE.MeshPhongMaterial({ color: 0x00ff44 });
			const tileMaterialEnd = new THREE.MeshPhongMaterial({ color: 0xff0000 });
			const tileMaterialPath = new THREE.MeshPhongMaterial({ color: 0x8086ff });

			for(var i = 0; i < actorCount; i++) {
				var dummyCell = new cell(0, 0, 1, false);
				actors[i].startCell = dummyCell;
				actors[i].endCell = dummyCell;
				while(actors[i].startCell.walkable == false || actors[i].endCell.walkable == false) {
					actors[i].startCell = grid.grid[Math.floor(Math.random()*399)];
					actors[i].endCell = grid.grid[Math.floor(Math.random()*399)];
				}
				actors[i].endCell.mesh = new THREE.Mesh(tileGeometry, tileMaterialEnd);
				actors[i].startCell.mesh = new THREE.Mesh(tileGeometry, tileMaterialStart);
				actors[i].endCell.mesh.position.set(actors[i].endCell.coords.x+0.5, 0.01, actors[i].endCell.coords.y+0.5);
				actors[i].endCell.mesh.rotation.x = -90*Math.PI/180;
				actors[i].startCell.mesh.position.set(actors[i].startCell.coords.x+0.5, 0.01, actors[i].startCell.coords.y+0.5);
				actors[i].startCell.mesh.rotation.x = -90*Math.PI/180;

				var tempCell = actors[i].endCell;
				aStar(grid, actors[i].startCell, actors[i].endCell);
				while(tempCell.parent) {
					actors[i].path.push(tempCell);
					tempCell = tempCell.parent;
				}
				actors[i].path = actors[i].path.reverse();
				actors[i].path.splice(0, 0, actors[i].startCell)
				grid.reset();

				for(j = 1; j < actors[i].path.length; j++) {
					if(j < actors[i].path.length-1) {
						actors[i].path[j].mesh = new THREE.Mesh(tileGeometry, tileMaterialPath);
						actors[i].path[j].mesh.rotation.x = -90 * Math.PI/180;
						actors[i].path[j].mesh.position.set(actors[i].path[j].coords.x+0.5, 0.01, actors[i].path[j].coords.y+0.5)
					}
					scene.add(actors[i].path[j].mesh, actors[i].startCell.mesh);
				}
				actors[i].position.set(actors[i].startCell.coords.x + 0.5, 0, actors[i].startCell.coords.y + 0.5);
				actors[i].model.position.set(actors[i].position.x, 0, actors[i].position.z);

			}
			gridCreated = true;
		}
		for (var i = 0; i < actorCount; i++) {
			if (actors[i].mixer) {
			actors[i].mixer.update(delta);
			}


			if(actors[i].count != actors[i].path.length-1) {
				actors[i].nextPosition.set(actors[i].path[actors[i].count+1].coords.x+0.5, 0, actors[i].path[actors[i].count+1].coords.y+0.5);
				actors[i].prevPosition.set(actors[i].path[actors[i].count].coords.x+0.5, 0, actors[i].path[actors[i].count].coords.y+0.5);
				actors[i].nextDirection = actors[i].nextPosition.clone().sub(actors[i].prevPosition);

				actors[i].steering = collisionAvoidance(actors[i]);

				actors[i].direction = actors[i].nextDirection.clone();
				actors[i].velocity = actors[i].direction.clone().add(actors[i].steering);
				//actors[i].velocity = actors[i].direction.clone();
				//actors[i].velocity.normalize();

				actors[i].prevVelocity = actors[i].velocity;
				actors[i].position.add(actors[i].velocity.clone().multiplyScalar(delta));


				mx = new THREE.Matrix4().lookAt(actors[i].velocity.clone().multiplyScalar(-1),new THREE.Vector3(0,0,0),new THREE.Vector3(0,1,0));
				actors[i].model.quaternion.setFromRotationMatrix(mx);

				actors[i].actions[1].weight = Math.sqrt(actors[i].velocity.x*actors[i].velocity.x + actors[i].velocity.y*actors[i].velocity.y + actors[i].velocity.z*actors[i].velocity.z)*0.5;

				if(actors[i].position.distanceTo(new THREE.Vector3(actors[i].endCell.coords.x+.5, 0, actors[i].endCell.coords.y+.5)) <= 1.0) {
					actors[i].actions[1].weight = THREE.Math.lerp(0,0.25,actors[i].position.distanceTo(new THREE.Vector3(actors[i].endCell.coords.x+.5, 0, actors[i].endCell.coords.y+.5))*3);
					actors[i].actions[0].weight = THREE.Math.lerp(1,0.1,actors[i].position.distanceTo(new THREE.Vector3(actors[i].endCell.coords.x+.5, 0, actors[i].endCell.coords.y+.5))*2);
				}
				actors[i].actions[0].play();
				actors[i].actions[1].play();
				actors[i].actions[2].play();

				if(actors[i].position.distanceTo(actors[i].nextPosition) <= 0.05) {
					//actors[i].prevDirection = actors[i].nextDirection.clone();
					actors[i].count++;
				}
				if(actors[i].count == actors[i].path.length) {
					actors[i].velocity = new THREE.Vector3(0,0,0);
				}
			}
			else {
				actors[i].velocity.set(0,0,0);
				actors[i].position.set(actors[i].endCell.coords.x+0.5, 0, actors[i].endCell.coords.y+0.5);
			}
			actors[i].model.position.set(actors[i].position.x, actors[i].position.y, actors[i].position.z);

			collision(actors, delta);
			// y = 0
			planeCollision(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), actors[i].position, actors[i].velocity, actors[i].prevPosition, delta);
			// z = 0
			planeCollision(new THREE.Vector3(0,0,-1), new THREE.Vector3(0,0,0), actors[i].position, actors[i].velocity, actors[i].prevPosition, delta);
			// z = -20
			planeCollision(new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-20), actors[i].position, actors[i].velocity, actors[i].prevPosition, delta);
			// x = 10
			planeCollision(new THREE.Vector3(-1,0,0), new THREE.Vector3(10,0,0), actors[i].position, actors[i].velocity, actors[i].prevPosition, delta);
			// x = -10
			planeCollision(new THREE.Vector3(1,0,0), new THREE.Vector3(-10,0,0), actors[i].position, actors[i].velocity, actors[i].prevPosition, delta);
		 }
	}

	}
	requestAnimationFrame(animate);
	renderer.render(scene, camera);

}

//function to calculate bounce with plane
function planeCollision(n, point, p, v, pp, delta){
	n.normalize();
	var d = -point.dot(n);
	if(p.dot(n) + d <= 0){
		var velocityDot = v.x * n.x + v.y * n.y + v.z * n.z;
		v.x = v.x - (1 + epsilon) * velocityDot * n.x;
		v.y = v.y - (1 + epsilon) * velocityDot * n.y;
		v.z = v.z - (1 + epsilon) * velocityDot * n.z;

		var positionDot = p.x * n.x + p.y * n.y + p.z * n.z;
		p.x = p.x - (1 + epsilon) * (positionDot + d) * n.x;
		p.y = p.y - (1 + epsilon) * (positionDot + d) * n.y;
		p.z = p.z - (1 + epsilon) * (positionDot + d) * n.z;

		var positionpDot = pp.x * n.x + pp.y * n.y + pp.z * n.z;
		pp.x = pp.x - (1 + epsilon) * (positionpDot + d) * n.x;
		pp.y = pp.y - (1 + epsilon) * (positionpDot + d) * n.y;
		pp.z = pp.z - (1 + epsilon) * (positionpDot + d) * n.z;
	}
}

function normalOfPlane(p1, p2, p3) {
	var ab = new THREE.Vector3(0,0,0);
	var ac = new THREE.Vector3(0,0,0);

	ab.x = p2.x - p1.x;
	ab.y = p2.y - p1.y;
	ab.z = p2.z - p1.z;

	ac.x = p3.x - p1.x;
	ac.y = p3.y - p1.y;
  ac.z = p3.z - p1.z;

	var normal = new THREE.Vector3(0,0,0);
	normal.crossVectors(ab,ac);
	return normal;
}

function  euler(p, v, pp, dt) {
	v.x = v.x;
	v.y = v.y + dt * (gravity/mass);
	v.z = v.z;

	pp.x = p.x;
	pp.y = p.y;
	pp.z = p.z;

	p.x = p.x + dt * v.x;
	p.y = p.y + dt * v.y;
	p.z = p.z + dt * v.z;
}

function verlet(p, pp, v, dt){

		var temp = new THREE.Vector3(0,0,0);
		temp.x = p.x;
		temp.y = p.y;
		temp.z = p.z;

		p.x = p.x * 2 - pp.x;
		p.y = p.y * 2 - pp.y + (gravity/mass)*dt*dt;
		p.z = p.z * 2 - pp.z;

		pp.x = temp.x;
		pp.y = temp.y;
		pp.z = temp.z;

		v.x = (p.x - pp.x)/dt;
		v.y = (p.y - pp.y)/dt;
		v.z = (p.z - pp.z)/dt;
}

function collision(actors, delta) {
	var tempVec = new THREE.Vector3(110,110,110);
	for(var i = 0; i < actorCount; i++) {
		for(var k = 0; k < actorCount; k++) {
			if(actors[i] != actors[k]) {
				tempVec = actors[i].position.clone().sub(actors[k].position);
			}
			if(tempVec.dot(tempVec) <= actorRadius*actorRadius + 0.0001) {
				var v = new THREE.Vector3(0,0,0);
				v = actors[i].position.clone().sub(actors[k].prevPosition);
				var tempVec2 = new THREE.Vector3(0,0,0);
				tempVec2 = actors[i].prevPosition.clone().sub(actors[k].position);

				var alpha = actors[i].velocity.dot(actors[i].velocity);
				var beta = 2 * actors[i].velocity.dot(tempVec);
				var gamma = (
					actors[k].position.dot(actors[k].position) +
					actors[i].prevPosition.dot(actors[i].prevPosition) -
					2 * actors[i].prevPosition.dot(actors[k].position) -
					actorRadius*actorRadius
				);
				var lambda1 = (-beta + Math.sqrt(beta*beta-4*alpha*gamma))/(2*alpha);
				var lambda2 = (-beta - Math.sqrt(beta*beta-4*alpha*gamma))/(2*alpha);
				lambda = findLambda(lambda1,lambda2);

				var collisionPoint = new THREE.Vector3(0,0,0);
				collisionPoint = actors[i].position.clone().add(actors[i].prevPosition.clone().sub(actors[i].position.x).multiplyScalar(lambda));

				var normal = new THREE.Vector3(collisionPoint.x - actors[k].position.x,collisionPoint.y - actors[k].position.y,collisionPoint.z - actors[k].position.z);
				planeCollision(normal, collisionPoint, actors[i].position, actors[i].velocity, actors[i].prevPosition, delta);

				}
			}
		}
	}
var cell = function(x, y, cost, walkable) {
	this.coords = new THREE.Vector2(x-10,y-20);
	this.x = x;
	this.y = y;
	this.walkable = walkable;
	this.mat = 0;
	this.geo = 0;
	this.mesh = 0;
	this.g = 0;
	this.f = cost;
	this.h = 0;
	this.neighbours = [];
	this.parent = 0;
}

var actor = function() {
	this.model = model;
	this.actions = 0;
	this.mixer = 0;
	this.position = new THREE.Vector3(0,0,0);
	this.nextPosition = new THREE.Vector3(0,0,0);
	this.prevPosition = new THREE.Vector3(0,0,0);
	this.prevDirection = new THREE.Vector3(0,0,0);
	this.nextDirection = new THREE.Vector3(0,0,0);
	this.ahead = new THREE.Vector3(0,0,0);
	this.ahead2 = new THREE.Vector3(0,0,0);
	this.steering = new THREE.Vector3(0,0,0);
	this.direction = new THREE.Vector3(0,0,0);
	this.velocity = new THREE.Vector3(0,0,0);
	this.prevVelocity = new THREE.Vector3(0,0,0);
	this.endCell = 0;
	this.startCell = 0;
	this.path = [];
	this.count = 0;
	this.raycaster = 0;
	this.cylinder = new THREE.CylinderGeometry(1,1,1,5)
}

var grid = function(width, height) {
	this.grid = [];
	this.length = width;
	for(i = 0; i < width; i++) {
		for(j = 0; j < height; j++) {
			var tempCell = new cell(i, j, 0, true);
			this.grid[i * width + j] = tempCell;
		}
	}
}
grid.prototype = {
	init: function(geo, mat) {
		var map = [];
		var width = this.length;
		for(i = 0; i < this.grid.length; i++) {
				this.grid[i].geo = geo;
				this.grid[i].mat = mat;
				this.grid[i].mesh = new THREE.Mesh(geo, mat);
				this.grid[i].mesh.name = "floor";
				this.grid[i].mesh.position.set(this.grid[i].coords.x+0.5, 0, this.grid[i].coords.y+0.5);
				this.grid[i].mesh.cell = this.grid[i];
		}
		for(i = 0; i < this.length; i++) {
			for(k = 0; k < this.length; k++) {
				if(i == 0) {
					if(k == 0) {
						this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+(k+1)])
						this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+k])
						this.grid[i*width+k].neighbours.push(this.grid[i*width+(k+1)])
					}
					else if(k == width-1) {
						this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+(k-1)])
						this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+k])
						this.grid[i*width+k].neighbours.push(this.grid[i*width+(k-1)])
					}
					else {
						this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+(k+1)])
						this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+k])
						this.grid[i*width+k].neighbours.push(this.grid[i*width+(k+1)])
						this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+(k-1)])
						this.grid[i*width+k].neighbours.push(this.grid[i*width+(k-1)])
					}
			}
			else if(i == width-1) {
				if(k == 0) {
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+(k+1)])
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+k])
					this.grid[i*width+k].neighbours.push(this.grid[i*width+(k+1)])
				}
				else if(k == width-1) {
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+(k-1)])
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+k])
					this.grid[i*width+k].neighbours.push(this.grid[i*width+(k-1)])
				}
				else {
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+k])
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+(k-1)])
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+(k+1)])
					this.grid[i*width+k].neighbours.push(this.grid[i*width+(k+1)])
					this.grid[i*width+k].neighbours.push(this.grid[i*width+(k-1)])
				}
			}
			else {
				if(k == 0) {
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+k])
					this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+k])
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+(k+1)])
					this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+(k+1)])
					this.grid[i*width+k].neighbours.push(this.grid[i*width+(k+1)])
				}
				else if(k == width-1) {
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+k])
					this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+k])
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+(k-1)])
					this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+(k-1)])
					this.grid[i*width+k].neighbours.push(this.grid[i*width+(k-1)])
				}
				else {
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+k])
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+(k-1)])
					this.grid[i*width+k].neighbours.push(this.grid[(i-1)*width+(k+1)])
					this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+k])
					this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+(k-1)])
					this.grid[i*width+k].neighbours.push(this.grid[(i+1)*width+(k+1)])
					this.grid[i*width+k].neighbours.push(this.grid[i*width+(k+1)])
					this.grid[i*width+k].neighbours.push(this.grid[i*width+(k-1)])
				}
			}
		}
	}
},
reset: function() {
	width = this.length;
	for(i = 0; i < width; i++) {
		for(j = 0; j < width; j++) {
			this.grid[i * width + j].g = 0;
			this.grid[i * width + j].f = 0;
			this.grid[i * width + j].h = 0;
			this.grid[i * width + j].parent = 0;
		}
	}
}
}

function aStar(grid, start, end) {
	var path = [];
	var open = [];
	var closed = [];
	for(i = 0; i < grid.grid.length; i++) {
		grid.grid[i].h = Math.sqrt((end.coords.x-grid.grid[i].coords.x)*(end.coords.x-grid.grid[i].coords.x) +
		 (end.coords.y-grid.grid[i].coords.y)*(end.coords.y-grid.grid[i].coords.y));
	}
	open.push(start);
	while(open.length > 0) {
		var current = open.pop();
		closed.push(current);
		for(i = 0; i < current.neighbours.length; i++) {
			var cost = current.g + 1;
			if(containsObject(current.neighbours[i], open) && cost < current.neighbours[i].g) {
				open.splice(open.indexOf(current.neighbours[i],1));
			}
			if(!containsObject(current.neighbours[i], open) && !containsObject(current.neighbours[i], closed) && current.neighbours[i].walkable) {
				current.neighbours[i].g = cost;
				current.neighbours[i].f = current.neighbours[i].g + current.neighbours[i].h;
				current.neighbours[i].f = -1*current.neighbours[i].f;
				current.neighbours[i].parent = current;
				open.push(current.neighbours[i]);
				open = sortOpen(open);
			}
		}
	}
}

function findLambda(lambda1, lambda2) {
			if(lambda1 > 0 && lambda1 < 1){
				if(lambda2 > 0 && lambda2 < 1 && lambda2 < lambda1){
					var lambda = lambda2;
				}
				else {
					var lambda = lambda1;
				}
			}
			else {
				var lambda = lambda2;
			}
			return lambda;
}

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i] === obj) {
            return true;
        }
    }
    return false;
}

function sortOpen(inputArr) {
	let len = inputArr.length;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len-i-1; j++) {
            if (inputArr[j].f > inputArr[j + 1].f) {
                let tmp = inputArr[j+1];
                inputArr[j+1] = inputArr[j];
                inputArr[j] = tmp;
            }
        }
    }
    return inputArr;
}

function onWindowResize() {
	// Camera frustum aspect ratio
	camera.aspect = window.innerWidth / window.innerHeight;
	// After making changes to aspect
	camera.updateProjectionMatrix();
	// Reset size
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove( event ) {

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

function onMouseClick( event ) {
	if(intersects[0].object.name == "floor") {
		intersects[0].object.cell.walkable = false;
		const wallGeometry = new THREE.BoxGeometry( 0.9,0.9,0.9 );
	  const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xff8ab5, side: THREE.DoubleSide});
		var wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
		wallMesh.position.set(intersects[0].object.position.x, 0.5 ,intersects[0].object.position.z);
		scene.add(wallMesh);
	}
}

function collisionAvoidance(actor) {
	var ahead = actor.position.clone().add(actor.velocity.clone());
	var start = actor.position.clone().add(new THREE.Vector3(0, 0.3, 0));

	actor.raycaster = new THREE.Raycaster(start, ahead);
	actor.raycaster.far = MAX_SEE_AHEAD;

	var avoidance = new THREE.Vector3(0,0,0);
	var obstacles = actor.raycaster.intersectObjects(scene.children);
	console.log(obstacles);

	if(obstacles.length > 0) {
		console.log("S")
		avoidance = ahead.clone().sub(obstacles.object.position);
		avoidance.normalize();
		avoidance.multiplyScalar(MAX_AVOID_FORCE);
		avoidance.y = 0;
	}
	return avoidance;
}

const cloneGltf = (gltf) => {
  const clone = {
    animations: gltf.animations,
    scene: gltf.scene.clone(true)
  };

  const skinnedMeshes = {};

  gltf.scene.traverse(node => {
    if (node.isSkinnedMesh) {
      skinnedMeshes[node.name] = node;
    }
  });

  const cloneBones = {};
  const cloneSkinnedMeshes = {};

  clone.scene.traverse(node => {
    if (node.isBone) {
      cloneBones[node.name] = node;
    }

    if (node.isSkinnedMesh) {
      cloneSkinnedMeshes[node.name] = node;
    }
  });

  for (let name in skinnedMeshes) {
    const skinnedMesh = skinnedMeshes[name];
    const skeleton = skinnedMesh.skeleton;
    const cloneSkinnedMesh = cloneSkinnedMeshes[name];

    const orderedCloneBones = [];

    for (let i = 0; i < skeleton.bones.length; ++i) {
      const cloneBone = cloneBones[skeleton.bones[i].name];
      orderedCloneBones.push(cloneBone);
    }

    cloneSkinnedMesh.bind(
        new THREE.Skeleton(orderedCloneBones, skeleton.boneInverses),
        cloneSkinnedMesh.matrixWorld);
  }

  return clone;
}

window.addEventListener('resize', onWindowResize, false);
window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('click', onMouseClick, false);

init();
requestAnimationFrame(animate);
