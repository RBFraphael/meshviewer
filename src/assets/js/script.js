const remote = require('electron').remote;
const events = require('electron').ipcRenderer;
const _path = require('path');
const path = remote.process.platform == "win32" ? _path.win32 : _path.posix;

var supportedExtensions = ["OBJ", "FBX", "GLTF", "GLB"];
var viewer = document.getElementById("viewer");
var camera, scene, renderer, controls;

setupDragAndDrop();
setupOpenEvent();
setupRendererBehaviour();
loadFromArguments();
setTextsByOs();

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop()
{
    viewer.ondragover = () => false;
    viewer.ondragleave = () => false;
    viewer.ondragend = () => false;
    viewer.ondrop = (e) => {
        e.preventDefault();
        if(e.dataTransfer.files.length > 0){
            loadFile(e.dataTransfer.files[0].path);
        }
    };
}

/**
 * Setup open functionality (Ctrl+O or File>Open)
 */
function setupOpenEvent()
{
    events.on("open", (e, path) => {
        if(path.length > 0){
            loadFile(path);
        }
    });
}

/**
 * Setup renderer update and window resize
 */
function setupRendererBehaviour()
{
    updateRenderer();
    window.addEventListener("resize", (e) => {
        e.preventDefault();
        resizeWindow();
    });
}

/**
 * Load files passed by arguments (CLI)
 */
function loadFromArguments()
{
    let args = remote.getGlobal("arguments");
    if(args.length > 1){
        loadFile(args[1]);
    }
}

/**
 * Verify and load supported 3D file
 * @param {string} file File path
 */
function loadFile(file)
{
    let filePath = "file://" + file;
    let fileExtension = filePath.split(".").pop().toUpperCase();
    if(["png", "jpg", "jpeg"].includes(fileExtension.toLowerCase())){
        setTexture(filePath);
    } else {
        renderFile(filePath, fileExtension);
    }
}

/**
 * Render supported 3D file on screen
 * @param {string} file URLified file path
 * @param {string} extension File extension
 */
function renderFile(file, extension)
{
    if(supportedExtensions.includes(extension)){
        switch(extension){
            case "OBJ":
                let dir = path.dirname(file);
                let filename = path.basename(file, ".obj");
                let mtl = path.join(dir, filename + ".mtl");
                new THREE.MTLLoader().load(mtl, (mat) => {
                    mat.preload();
                    new THREE.OBJLoader().setMaterials(mat).load(file, (obj) => {
                        obj.position.set(0, 0, 0);
                        renderObject(obj);
                        setStatus(file);
                    }, undefined, (e) => {
                        alert("Failed to load OBJ file " + file);
                        console.log(e);
                        return;
                    });
                }, undefined, (e) => {
                    alert("Failed to load MTL file " + mtl);
                    console.log(e);
                    return;
                });
            break;
            case "FBX":
                new THREE.FBXLoader().load(file, (obj) => {
                    obj.position.set(0, 0, 0);
                    renderObject(obj);
                    setStatus(file);
                }, undefined, (e) => {
                    alert("Failed to load FBX file " + file);
                    console.log(e);
                    return;
                });
            break;
            case "GLTF":
            case "GLB":
                new THREE.GLTFLoader().load(file, (obj) => {
                    obj.scene.position.set(0, 0, 0);
                    renderObject(obj.scene);
                    setStatus(file);
                }, undefined, (e) => {
                    alert("Failed to load GLTF file " + file);
                    console.log(e);
                    return;
                });
            break;
            default:
                alert(extension + " files are not supported.");
            break;
        }
    } else {
        alert("Unsupported file");
    }
}

/**
 * Renders a 3D object into screen
 * @param {Object3D} object 3D object to render
 */
function renderObject(object)
{
    viewer.innerHTML = "";

    let w = window.innerWidth;
    let h = window.innerHeight;

    camera = new THREE.PerspectiveCamera(45, w/h, 1, 20000);
    camera.position.set(10, 10, 30);
    scene = new THREE.Scene();

    let hLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hLight.position.set(0, 200, 0);
    scene.add(hLight);

    let dLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dLight.position.set( 0, 200, 100 );
    dLight.castShadow = true;
    dLight.shadow.camera.top = 180;
    dLight.shadow.camera.bottom = - 100;
    dLight.shadow.camera.left = - 120;
    dLight.shadow.camera.right = 120;
    scene.add(dLight);

    renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    viewer.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.update();

    fixMaterials(object);
    scene.add(object);
    cameraToObject(object);
    
    renderer.render(scene, camera);
}

/**
 * Center camera to passed Object3D
 * @param {Object3D} object 3D object
 */
function cameraToObject(object)
{
    var offset = 1.2;

    var box = new THREE.Box3().setFromObject(object);
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

/**
 * Update 3D renderer for animation and controls
 */
function updateRenderer()
{
    requestAnimationFrame(updateRenderer);
    if(camera != undefined && scene != undefined && renderer != undefined && controls != undefined){
        renderer.render(scene, camera);
        controls.update();
    }
}

/**
 * Update camera and renderer when resizing window
 */
function resizeWindow()
{
    if(camera != undefined && scene != undefined && renderer != undefined && controls != undefined){
        let w = window.innerWidth;
        let h = window.innerHeight;

        camera.aspect = w/h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
}

/**
 * Adjust object's material and childrens' materials
 * @param {Object3D} object 3D object
 */
function fixMaterials(object)
{
    if(typeof(object.material) != "undefined"){
        object.material.metalness = 0;
    }

    object.children.forEach((obj) => {
        fixMaterials(obj);
    });
}

/**
 * Loads a texture and call function to set texture in all materials
 * @param {String} file Texture file path
 */
function setTexture(file)
{
    if(typeof(scene) != "undefined"){
        let loader = new THREE.TextureLoader();
        loader.load(file, (texture) => {
            setObjectTexture(texture);
        });
    } else {
        alert("Open a 3D file before adding textures.");
    }
}

/**
 * Set texture in all materials and children's materials
 * @param {Texture} texture Texture to apply
 * @param {Object3D} object Object will receive texture
 */
function setObjectTexture(texture, object = scene)
{
    if(typeof(object.material) != "undefined"){
        if(Array.isArray(object.material)){
            object.material.forEach((mat) => {
                mat.map = texture;
            });
        } else {
            object.material.map = texture;
        }
    }

    object.children.forEach((child) => {
        setObjectTexture(texture, child);
    });
}

/**
 * Set status box texts
 * @param {string} file File path
 */
function setStatus(file)
{
    document.getElementById("filename").innerText = path.basename(file);
    document.getElementById("triangles").innerText = renderer.info.render.triangles
    document.getElementById("mesh-status").style.display = "block";
}

/**
 * Set initial message texts based on operating system
 */
function setTextsByOs()
{
    if(remote.process.platform == "darwin"){
        document.getElementById("open-shortcut").innerText = "Cmd + O";
        document.getElementById("open-path").innerText = "Mesh Viewer > Open 3D File";
    } else {
        document.getElementById("open-shortcut").innerText = "Ctrl + O";
        document.getElementById("open-path").innerText = "File > Open 3D File";
    }
}