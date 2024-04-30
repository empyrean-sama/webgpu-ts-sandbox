import shaderSource from 'bundle-text:./shader.wgsl'
import littlerootImgPath from './img/littleroot.png';

//Main method;
(async () => {
    const canvas = document.getElementById('canvas-view') as HTMLCanvasElement;
    const littlerootBitmap: ImageBitmap = await asyncLoadImageFromUrl(littlerootImgPath);

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
    const positionData = getQuadPosCoords();
    const positionBuffer = device.createBuffer({
        size: positionData.BYTES_PER_ELEMENT * positionData.length,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(positionBuffer.getMappedRange()).set(positionData);
    positionBuffer.unmap();

    //Create a texture coordinates buffer
    const texCoordsData = getQuadTexCoords();
    const texCoordsBuffer = device.createBuffer({
        size: texCoordsData.length * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true
    });
    new Float32Array(texCoordsBuffer.getMappedRange()).set(texCoordsData);
    texCoordsBuffer.unmap();

    //Create an index buffer
    const quadIndexData: Uint16Array = getQuadIndices();
    const indexBuffer = device.createBuffer({
        size: Uint16Array.BYTES_PER_ELEMENT * quadIndexData.length,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    })
    new Uint16Array(indexBuffer.getMappedRange()).set(quadIndexData);
    indexBuffer.unmap();

    //create shader module along with vertex and fragment state
    const shaderModule = device.createShaderModule({code: shaderSource});
    const vertexState: GPUVertexState = {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [
            {
                arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, //2 values per one position entry
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
                arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, //2 values per one texture coordinate
                attributes: [
                    {
                        format: 'float32x2',
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

    //Create texture
    const texture = device.createTexture({
        size: {width: littlerootBitmap.width, height: littlerootBitmap.height},
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    device.queue.copyExternalImageToTexture({source: littlerootBitmap},{texture},[littlerootBitmap.width, littlerootBitmap.height]);

    //Create sampler
    const sampler = device.createSampler({
        magFilter: "linear",
        minFilter: "linear"
    });

    //Create a Bind Group
    const bindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {}
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {}
            }
        ]
    });

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: sampler
            },
            {
                binding: 1,
                resource: texture.createView()
            }
        ]
    });

    //Create Pipeline layout
    const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
    });

    //Create the pipeline
    const pipeline = device.createRenderPipeline({
        vertex: vertexState,
        fragment: fragmentState,
        primitive: {topology: 'triangle-list'},
        layout: pipelineLayout
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

    //Bind everything and draw
    renderPassEncoder.setIndexBuffer(indexBuffer,"uint16");
    renderPassEncoder.setVertexBuffer(0,positionBuffer);
    renderPassEncoder.setVertexBuffer(1,texCoordsBuffer);
    renderPassEncoder.setBindGroup(0,bindGroup);
    renderPassEncoder.drawIndexed(6);
   
    renderPassEncoder.end();

    //submit finished drawing to the screen
    device.queue.submit([commandEncoder.finish()]);
})();


function getQuadIndices(): Uint16Array {
    return new Uint16Array([
        0,1,2, //triangle 1
        3,2,0, //triangle 2
    ]);
}

function getQuadPosCoords(): Float32Array {
    return new Float32Array([
        -0.5,-0.5, //bottom left
         0.5,-0.5, //bottom right
         0.5, 0.5, //top right
        -0.5, 0.5, //top left
    ]);
}

function getQuadTexCoords(): Float32Array {
    return new Float32Array([
        0.0,1.0, //bottom left
        1.0,1.0, //bottom right
        1.0,0.0, //top right
        0.0,0.0, //top left
    ]);
}

function asyncLoadImageFromUrl(url: string): Promise<ImageBitmap> {
    return new Promise((resolve,reject) => {
        const image = document.createElement('img') as HTMLImageElement;
        image.onload = () => resolve(createImageBitmap(image));
        image.onerror = () => reject('unable to load image');
        image.src = url;
    });
}