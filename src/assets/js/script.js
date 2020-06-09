const remote = require('electron').remote;
const events = require('electron').ipcRenderer;
var threejs_renderers = [];
var viewer = document.getElementById("viewer");

let args = remote.getGlobal("arguments");
if(args.length > 1){
    let file = args[1];
    let model = "file://" + encodeURI(file);
    threejs_renderers = [];
    viewer.innerHTML = "";
    ThreeJSBuilder(model, viewer, file.split(".").pop().toUpperCase());
}

events.on("open", (e, path) => {
    if(path.length > 0){
        let file = path;
        let model = "file://" + file;
        threejs_renderers = [];
        viewer.innerHTML = "";
        ThreeJSBuilder(model, viewer, file.split(".").pop().toUpperCase());
    }
});

ThreeJSRenderer();
window.addEventListener("resize", e => {
    ThreeJSResize();
});

function ThreeJSBuilder(object, element, type)
{
    var camera, scene, renderer, light, controls;

    let width = window.innerWidth;
    let height = window.innerHeight;

    camera = new THREE.PerspectiveCamera(45, width / height, 1, 20000);
    camera.position.set(10, 20, 30);

    scene = new THREE.Scene();

    light = new THREE.HemisphereLight(0xffffff, 0x444444);
    light.position.set(0, 200, 0);
    scene.add(light);

    light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set( 0, 200, 100 );
    light.castShadow = true;
    light.shadow.camera.top = 180;
    light.shadow.camera.bottom = - 100;
    light.shadow.camera.left = - 120;
    light.shadow.camera.right = 120;
    scene.add(light);

    renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    element.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.update();

    switch(type){
        case "FBX":
            new THREE.FBXLoader().load(object, (obj) => {
                obj.position.set(0, 0, 0);
                scene.add(obj);
                cameraToObject(obj, camera, controls);
            }, (load) => {}, (error) => {
                alert("Unsupported FBX file");
                viewer.innerHTML = "<p id=\"msg\">Go to File > Open 3D File and select a OBJ file to view.</p>";
            });
        break;
        case "OBJ":
            let path = object.split("/");
            path.pop();
            path = path.join("/") + "/";
            let objFile = object.split("/").pop();
            let mtlFile = objFile.split(".")[0] + ".mtl";
            new THREE.MTLLoader().setPath(path).load(mtlFile, (materials) => {
                materials.preload();
                new THREE.OBJLoader().setMaterials(materials).setPath(path).load(objFile, (obj) => {
                    obj.position.set(0, 0, 0);
                    scene.add(obj);
                    cameraToObject(obj, camera, controls);
                });
            });
        break;
        case "GLTF":
            var loader = new THREE.GLTFLoader();
            loader.load(object, function(obj){
                obj.position.set(0, 0, 0);
                scene.add(obj);
                cameraToObject(obj, camera, controls);
            }, (load) => {}, (error) => {
                alert("Unsupported GLTF file.");
                viewer.innerHTML = "<p id=\"msg\">Go to File > Open 3D File and select a OBJ file to view.</p>";
            });
        break;
        case "STL":
            var loader = new THREE.STLLoader();
            loader.load(object, function(obj){
                obj.position.set(0, 0, 0);
                scene.add(obj);
                cameraToObject(obj, camera, controls);
            }, (load) => {}, (error) => {
                alert("Unsupported GLTF file.");
                viewer.innerHTML = "<p id=\"msg\">Go to File > Open 3D File and select a OBJ file to view.</p>";
            });
        break;
        default:
            alert("Unsupported file type");
            viewer.innerHTML = "<p id=\"msg\">Go to File > Open 3D File and select a OBJ file to view.</p>";
            return;
        break;
    }

    threejs_renderers.push({
        camera: camera,
        scene: scene,
        renderer: renderer,
        controls: controls,
        element: element,
    });
}

function ThreeJSRenderer()
{
    requestAnimationFrame(ThreeJSRenderer);
    threejs_renderers.forEach(function(obj){
        obj.renderer.render(obj.scene, obj.camera);
        obj.controls.update();
    });
}

function ThreeJSResize()
{
    threejs_renderers.forEach(function(obj){
        let width = window.innerWidth;
        let height = window.innerHeight;

        obj.camera.aspect = width / height;
        obj.camera.updateProjectionMatrix();

        obj.renderer.setSize(width, height);
    });
}

function cameraToObject(obj, camera, controls, offset = 1.2)
{
    var box = new THREE.Box3().setFromObject(obj);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());

    var maxSize = Math.max(size.x, size.y, size.z);
    var heightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
    var widthDistance = heightDistance / camera.aspect;
    var distance = offset * Math.max(heightDistance, widthDistance);

    var direction = controls.target.clone().sub(camera.position).normalize().multiplyScalar(distance);

    controls.maxDistance = distance * 10;
    controls.target.copy(center);

    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();

    camera.position.copy(controls.target).sub(direction);
    controls.update();
}