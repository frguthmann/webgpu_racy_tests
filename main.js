import {CLEAR_CS} from "./clear_cs.js";
import {VALIDATION_CS} from "./validation_cs.js";
import {DISPLAY_VS} from "./display_vs.js";
import {DISPLAY_FS} from "./display_fs.js";
import {V0} from "./v0.js";
import {V1} from "./v1.js";
import {V2} from "./v2.js";
import {V3} from "./v3.js";
import {V4} from "./v4.js";
import {GUI} from "./libs/lil-gui/lilgui.js";

const TEXTURE_SIZE = 64;
const TEXTURE_FORMAT = "r32uint";
let context, canvas, device, testBindGroup, testConstantBuffer, testAtomicBuffer;
let clearPipeline, validationPipeline, displayPipeline, v0Pipeline, v1Pipeline, v2Pipeline, v3Pipeline, v4Pipeline;

const tests = {Sanity_Test_Pass: 0, Sanity_Test_Fail: 1, V0_Should_Race: 2, V1_Should_Race: 3, V2_Should_Race: 4, V3_Should_Theoretically_Race: 5, V4_Should_Not_Race: 6};
let test = {value: tests.Sanity_Test_Pass};

const slowdownTiers = {None: 0, Low: 500, Medium: 5000, Heavy: 50000};
const slowdown = {value: slowdownTiers.Low};

const forceFrameSync = {value: false};

let canRunNextFrame = true;
(async () =>
{
    if (!navigator.gpu)
    {
        alert("WebGPU not supported! To see this content, you must use Chrome Canary and enable this UNSAFE flag: chrome://flags/#enable-unsafe-webgpu");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter)
    {
        alert("No WebGPU adpater found");
    }

    device = await adapter.requestDevice();

    if (!device)
    {
        alert("No WebGPU device found");
    }

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    canvas = document.getElementById("WebGPUCanvas");
    context = canvas.getContext("webgpu");
    if (!context)
    {
        alert("No WebGPU context could be acquired");
    }

    context.configure({
        device,
        format: presentationFormat,
    });

    const inputTexture2D = device.createTexture({
        size: [TEXTURE_SIZE, TEXTURE_SIZE, 1],
        mipLevelCount: 1,
        format: TEXTURE_FORMAT,
        dimension: "2d",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });
    inputTexture2D.label = "inputTexture2D";

    const outputTexture2D = device.createTexture({
        size: [TEXTURE_SIZE, TEXTURE_SIZE, 1],
        mipLevelCount: 1,
        format: TEXTURE_FORMAT,
        dimension: "2d",
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
    });
    inputTexture2D.label = "inputTexture2D";

    testConstantBuffer = device.createBuffer({
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: false,
    });
    testConstantBuffer.label = "testConstantBuffer";

    testAtomicBuffer = device.createBuffer({
        size: 4 * 2,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: false,
    });
    testAtomicBuffer.label = "testAtomicBuffer";

    const testBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                storageTexture: {
                    access: "read-write",
                    viewDimension: '2d',
                    format: TEXTURE_FORMAT,
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                storageTexture: {
                    access: "read-write",
                    viewDimension: '2d',
                    format: TEXTURE_FORMAT,
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                },
            },
            {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "storage",
                },
            }
        ],
    });
    testBindGroupLayout.label = "testBindGroupLayout";

    testBindGroup = device.createBindGroup({
        layout: testBindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: inputTexture2D.createView()
            },
            {
                binding: 1,
                resource: outputTexture2D.createView()
            },
            {
                binding: 2,
                resource: {
                    buffer: testConstantBuffer,
                }
            },
            {
                binding: 3,
                resource: {
                    buffer: testAtomicBuffer
                }
            }
        ],
    });
    testBindGroup.label = "testBindGroup";

    function createComputePipeline (bindGroupLayouts, shaderCode, entryPoint, label)
    {
        const pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: bindGroupLayouts
            }),
            compute: {
                module: device.createShaderModule({
                    code: shaderCode,
                }),
                entryPoint: entryPoint,
            },
        });
        pipeline.label = label;

        return pipeline
    }

    v0Pipeline          = createComputePipeline([testBindGroupLayout], V0,              "main", "v0Pipeline");
    v1Pipeline          = createComputePipeline([testBindGroupLayout], V1,              "main", "v1Pipeline");
    v2Pipeline          = createComputePipeline([testBindGroupLayout], V2,              "main", "v2Pipeline");
    v3Pipeline          = createComputePipeline([testBindGroupLayout], V3,              "main", "v3Pipeline");
    v4Pipeline          = createComputePipeline([testBindGroupLayout], V4,              "main", "v4Pipeline");
    clearPipeline       = createComputePipeline([testBindGroupLayout], CLEAR_CS,        "main", "clearPipeline");
    validationPipeline  = createComputePipeline([testBindGroupLayout], VALIDATION_CS,   "main", "validationPipeline");

    displayPipeline = device.createRenderPipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [testBindGroupLayout]
        }),
        vertex: {
            module: device.createShaderModule({
                code: DISPLAY_VS,
            }),
        },
        fragment: {
            module: device.createShaderModule({
                code: DISPLAY_FS,
            }),
            targets: [
                {
                    format: presentationFormat,
                },
            ],
        },
        primitive: {
            topology: 'triangle-list',
        },
    });


    let gui = new GUI();
    gui.add(test, "value", tests).name("Test");
    gui.add(slowdown, "value", slowdownTiers).name("Slowdown Mode");
    gui.add(forceFrameSync, "value").name("Force CPU frame sync");

    mainLoop();
}
)();

let frameID = 0;
function mainLoop ()
{
    const devicePixelRatio = window.devicePixelRatio;
    const currentWidth = Math.floor(canvas.clientWidth * devicePixelRatio);
    const currentHeight = Math.floor(canvas.clientHeight * devicePixelRatio);

    if ((currentWidth !== canvas.width || currentHeight !== canvas.height) && currentWidth && currentHeight)
    {
        canvas.width = currentWidth;
        canvas.height = currentHeight;
    }

    canRunNextFrame = canRunNextFrame || !forceFrameSync.value;
    if (canRunNextFrame)
    {
        let clearValue = frameID - 1;
        if (test.value === tests.Sanity_Test_Pass)
        {
            clearValue = frameID;
        }
        else if (test.value === tests.Sanity_Test_Fail)
        {
            clearValue = 0;
        }

        device.queue.writeBuffer(
            testConstantBuffer,
            0,
            new Uint32Array([frameID, clearValue, slowdown.value, 0]).buffer,
            0,
            4 * 4
        );

        device.queue.writeBuffer(
            testAtomicBuffer,
            0,
            new Uint32Array([0, 0]).buffer,
            0,
            4 * 2
        );

        const commandEncoder = device.createCommandEncoder();

        commandEncoder.pushDebugGroup("CLEAR OUTPUT TEXTURE");
        const clearPassEncoder = commandEncoder.beginComputePass();
        clearPassEncoder.setPipeline(clearPipeline);
        clearPassEncoder.setBindGroup(0, testBindGroup);
        clearPassEncoder.dispatchWorkgroups(TEXTURE_SIZE / 8, TEXTURE_SIZE / 8, 1);
        clearPassEncoder.end();
        commandEncoder.popDebugGroup();

        switch (test.value)
        {
            case tests.V0_Should_Race:
                commandEncoder.pushDebugGroup("TEST V0");
                const v0PassEncoder = commandEncoder.beginComputePass();
                v0PassEncoder.setPipeline(v0Pipeline);
                v0PassEncoder.setBindGroup(0, testBindGroup);
                v0PassEncoder.dispatchWorkgroups(4096 / TEXTURE_SIZE, 4096 / TEXTURE_SIZE, 1);
                v0PassEncoder.end();
                commandEncoder.popDebugGroup();
                break;
            case tests.V1_Should_Race:
                commandEncoder.pushDebugGroup("TEST V1");
                const v1PassEncoder = commandEncoder.beginComputePass();
                v1PassEncoder.setPipeline(v1Pipeline);
                v1PassEncoder.setBindGroup(0, testBindGroup);
                v1PassEncoder.dispatchWorkgroups(4096 / TEXTURE_SIZE, 4096 / TEXTURE_SIZE, 1);
                v1PassEncoder.end();
                commandEncoder.popDebugGroup();
                break;
            case tests.V2_Should_Race:
                commandEncoder.pushDebugGroup("TEST V2");
                const v2PassEncoder = commandEncoder.beginComputePass();
                v2PassEncoder.setPipeline(v2Pipeline);
                v2PassEncoder.setBindGroup(0, testBindGroup);
                v2PassEncoder.dispatchWorkgroups(4096 / TEXTURE_SIZE, 4096 / TEXTURE_SIZE, 1);
                v2PassEncoder.end();
                commandEncoder.popDebugGroup();
                break;
            case tests.V3_Should_Theoretically_Race:
                commandEncoder.pushDebugGroup("TEST V3");
                const v3PassEncoder = commandEncoder.beginComputePass();
                v3PassEncoder.setPipeline(v3Pipeline);
                v3PassEncoder.setBindGroup(0, testBindGroup);
                v3PassEncoder.dispatchWorkgroups(4096 / TEXTURE_SIZE, 4096 / TEXTURE_SIZE, 1);
                v3PassEncoder.end();
                commandEncoder.popDebugGroup();
                break;
            case tests.V4_Should_Not_Race:
                commandEncoder.pushDebugGroup("TEST V4");
                const v4PassEncoder = commandEncoder.beginComputePass();
                v4PassEncoder.setPipeline(v4Pipeline);
                v4PassEncoder.setBindGroup(0, testBindGroup);
                v4PassEncoder.dispatchWorkgroups(4096 / TEXTURE_SIZE, 4096 / TEXTURE_SIZE, 1);
                v4PassEncoder.end();
                commandEncoder.popDebugGroup();
                break;
        }

        commandEncoder.pushDebugGroup("CHECK RESULT CS");
        const validationPassEncoder = commandEncoder.beginComputePass();
        validationPassEncoder.setPipeline(validationPipeline);
        validationPassEncoder.setBindGroup(0, testBindGroup);
        validationPassEncoder.dispatchWorkgroups(TEXTURE_SIZE / 8, TEXTURE_SIZE / 8, 1);
        validationPassEncoder.end();
        commandEncoder.popDebugGroup();

        // Force WebGPU to present so that profiling tools can capture a frame
        const renderPassDescriptor = {
            colorAttachments: [
                {
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        };

        commandEncoder.pushDebugGroup("DISPLAY RESULT");
        const displayPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        displayPassEncoder.setPipeline(displayPipeline);
        displayPassEncoder.setBindGroup(0, testBindGroup);
        displayPassEncoder.draw(3);
        displayPassEncoder.end();
        commandEncoder.popDebugGroup()

        device.queue.submit([commandEncoder.finish()]);

        device.queue.onSubmittedWorkDone().then(() => {canRunNextFrame = true;});
        canRunNextFrame = false;
    }

    endMainLoop();
}

function endMainLoop ()
{
    frameID++;
    requestAnimationFrame(mainLoop);
}