import {TEST_BINDGROUP} from "./test_bindgroup.js";

export const V0 = TEST_BINDGROUP + /* wgsl */`

    @compute @workgroup_size(256, 1, 1)
    fn main( @builtin(global_invocation_id) GlobalThreadID : vec3<u32>, @builtin(workgroup_id) WorkGroupID : vec3<u32>, @builtin(local_invocation_index) LocalInvocationIndex : u32,  @builtin(local_invocation_id) LocalInvocationId : vec3<u32> )
    {
        if(LocalInvocationIndex > 63)
        {
            // DO SOMETHING HEAVY
            var res = 0.0;
            for(var i = 0u; i < frameIDClearValueSlowdownCount.z; i++)
            {
                res += sin(f32(i));
            }

            if(LocalInvocationIndex == 64 || res <= 0.0)
            {
                textureStore(inputTexture, WorkGroupID.xy, vec4<u32>(frameIDClearValueSlowdownCount.x, 0u, 0u, 0u));
            }
        }

        // global atomic counter
        if (LocalInvocationIndex == 0)
        {
            atomicAdd(&testSyncAndErrorCount[0], 1);
        }

        // atomic sync
        if(atomicLoad(&testSyncAndErrorCount[0]) != (4096 - 1))
        {
            return;
        }

        // do the reading and copy to different texture
        let offset = vec2<u32>(LocalInvocationId.x % 16, LocalInvocationId.x / 16) * vec2<u32>(4, 4);
        let texel00 = textureLoad(inputTexture, vec2<u32>(0, 0) + offset).x;
        let texel01 = textureLoad(inputTexture, vec2<u32>(0, 1) + offset).x;
        let texel02 = textureLoad(inputTexture, vec2<u32>(0, 2) + offset).x;
        let texel03 = textureLoad(inputTexture, vec2<u32>(0, 3) + offset).x;
        
        let texel10 = textureLoad(inputTexture, vec2<u32>(1, 0) + offset).x;
        let texel11 = textureLoad(inputTexture, vec2<u32>(1, 1) + offset).x;
        let texel12 = textureLoad(inputTexture, vec2<u32>(1, 2) + offset).x;
        let texel13 = textureLoad(inputTexture, vec2<u32>(1, 3) + offset).x;
        
        let texel20 = textureLoad(inputTexture, vec2<u32>(2, 0) + offset).x;
        let texel21 = textureLoad(inputTexture, vec2<u32>(2, 1) + offset).x;
        let texel22 = textureLoad(inputTexture, vec2<u32>(2, 2) + offset).x;
        let texel23 = textureLoad(inputTexture, vec2<u32>(2, 3) + offset).x;
        
        let texel30 = textureLoad(inputTexture, vec2<u32>(3, 0) + offset).x;
        let texel31 = textureLoad(inputTexture, vec2<u32>(3, 1) + offset).x;
        let texel32 = textureLoad(inputTexture, vec2<u32>(3, 2) + offset).x;
        let texel33 = textureLoad(inputTexture, vec2<u32>(3, 3) + offset).x;
      
        textureStore(outputTexture, vec2<u32>(0, 0) + offset, vec4<u32>(texel00));
        textureStore(outputTexture, vec2<u32>(0, 1) + offset, vec4<u32>(texel01));
        textureStore(outputTexture, vec2<u32>(0, 2) + offset, vec4<u32>(texel02));
        textureStore(outputTexture, vec2<u32>(0, 3) + offset, vec4<u32>(texel03));
        
        textureStore(outputTexture, vec2<u32>(1, 0) + offset, vec4<u32>(texel10));
        textureStore(outputTexture, vec2<u32>(1, 1) + offset, vec4<u32>(texel11));
        textureStore(outputTexture, vec2<u32>(1, 2) + offset, vec4<u32>(texel12));
        textureStore(outputTexture, vec2<u32>(1, 3) + offset, vec4<u32>(texel13));
        
        textureStore(outputTexture, vec2<u32>(2, 0) + offset, vec4<u32>(texel20));
        textureStore(outputTexture, vec2<u32>(2, 1) + offset, vec4<u32>(texel21));
        textureStore(outputTexture, vec2<u32>(2, 2) + offset, vec4<u32>(texel22));
        textureStore(outputTexture, vec2<u32>(2, 3) + offset, vec4<u32>(texel23));
        
        textureStore(outputTexture, vec2<u32>(3, 0) + offset, vec4<u32>(texel30));
        textureStore(outputTexture, vec2<u32>(3, 1) + offset, vec4<u32>(texel31));
        textureStore(outputTexture, vec2<u32>(3, 2) + offset, vec4<u32>(texel32));
        textureStore(outputTexture, vec2<u32>(3, 3) + offset, vec4<u32>(texel33));
    }
`;