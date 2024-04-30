import shaderSource from 'bundle-text:./shader.wgsl'
// import littlerootImgPath from './img/littleroot.png';

//Main method;
(async () => {
    const canvas = document.getElementById('canvas-view') as HTMLCanvasElement;
    // const littlerootBitmap: ImageBitmap = await asyncLoadImageFromUrl(littlerootImgPath);

    //Check if webgpu can work on this machine
    const canvasContext: GPUCanvasContext | null = canvas.getContext("webgpu");
    const adapter = await navigator.gpu.requestAdapter({powerPreference: "high-performance"});
    if(!canvasContext || !adapter){
        throw new Error('webgpu not supported on this machine');
    }

    //Get the device from adapter
    const device = await adapter.requestDevice();

    //Configure the canvas context to view the texture
    canvasContext.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat()
    })

    //Create a position vertex buffer
    const positionData = getTrianglePositionData();
    const positionBuffer = device.createBuffer({
        size: positionData.BYTES_PER_ELEMENT * positionData.length,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(positionBuffer.getMappedRange()).set(positionData);
    positionBuffer.unmap();

    //Create a color vertex buffer
    const colorData = getTriangleRedColorData();
    const colorBuffer = device.createBuffer({
        size: colorData.length * colorData.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true
    });
    new Float32Array(colorBuffer.getMappedRange()).set(colorData);
    colorBuffer.unmap();

    //create shader module along with vertex and fragment state
    const shaderModule = device.createShaderModule({code: shaderSource});
    const vertexState: GPUVertexState = {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [
            {
                arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, //2 positions per vertex
                attributes: [
                    {
                        format: 'float32x2',
                        offset: 0,
                        shaderLocation: 0
                    }
                ],
                stepMode: 'vertex'
            },
            {
                arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT, //3 colors per unit
                attributes: [
                    {
                        format: 'float32x3',
                        offset: 0,
                        shaderLocation: 1
                    }
                ],
                stepMode: 'vertex'
            }
        ]
    };
    const fragmentState: GPUFragmentState = {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
            {
                format: navigator.gpu.getPreferredCanvasFormat()
            }
        ]
    };
    
    //Create the pipeline
    const pipeline = device.createRenderPipeline({
        vertex: vertexState,
        fragment: fragmentState,
        primitive: {topology: 'triangle-list'},
        layout: 'auto'
    });

    //Create the render pass encoder
    const commandEncoder = device.createCommandEncoder();
    const renderPassEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
            {
                view: canvasContext.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: [.6,.6,.6,1]
            }
        ]
    });

    //Set the pipeline and draw
    renderPassEncoder.setPipeline(pipeline);
    renderPassEncoder.setVertexBuffer(0,positionBuffer);
    renderPassEncoder.setVertexBuffer(1,colorBuffer);
    renderPassEncoder.draw(3);
    renderPassEncoder.end();

    //submit finished drawing to the screen
    device.queue.submit([commandEncoder.finish()]);
})();


function getTrianglePositionData(): Float32Array {
    return new Float32Array([
        -0.5,-0.5, //bottom left
         0.5,-0.5, //bottom right
         0.0, 0.5  //top center 
    ]);
}

function getTriangleRedColorData(): Float32Array {
    return new Float32Array([
        1.0,0.0,0.0,
        1.0,0.0,0.0,
        1.0,0.0,0.0
    ]);
}

// function asyncLoadImageFromUrl(url: string): Promise<ImageBitmap> {
//     return new Promise((resolve,reject) => {
//         const image = document.createElement('img') as HTMLImageElement;
//         image.onload = () => resolve(createImageBitmap(image));
//         image.onerror = () => reject('unable to load image');
//         image.src = url;
//     });
// }