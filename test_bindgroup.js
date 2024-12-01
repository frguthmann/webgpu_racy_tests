export const TEST_BINDGROUP = /* wgsl */`

    @group(0) @binding(0) var inputTexture : texture_storage_2d<r32uint, read_write>;
    @group(0) @binding(1) var outputTexture : texture_storage_2d<r32uint, read_write>;
    @group(0) @binding(2) var<uniform> frameIDClearValueSlowdownCount : vec4<u32>;
    @group(0) @binding(3) var<storage, read_write> testSyncAndErrorCount: array<atomic<u32>>;
`;