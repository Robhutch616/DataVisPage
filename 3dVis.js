var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, 1, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( 400, 400 );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

var geometry = new THREE.PlaneGeometry( 5, 20, 32 );
var material = new THREE.MeshLambertMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
var plane = new THREE.Mesh( geometry, material );
plane.rotation.x = 90 * (Math.PI/180);
plane.position.y = -1;
scene.add( plane );



// create a point light
var pointLight =
  	new THREE.PointLight(0xFFFFFF);

// set its position
pointLight.position.x = 10;
pointLight.position.y = 50;
pointLight.position.z = 130;

// add to the scene
scene.add(pointLight);

var controls = new THREE.OrbitControls( camera );
controls.addEventListener( 'change', render );

camera.position.y = 3;
camera.position.x = 3;
camera.position.z = 3;
camera.lookAt(new THREE.Vector3(0, 0, 0));


function render() {
  	renderer.render( scene, camera );
}

function animate() {
  	requestAnimationFrame( animate );
  	
  	//Constant update
  	//cube.rotation.y += 0.01;
  	
  	controls.update();
  	render();
}

animate();
render();