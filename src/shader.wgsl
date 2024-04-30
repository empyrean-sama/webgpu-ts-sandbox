struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoords: vec2f
}

@vertex
fn vertexMain(@location(0) position: vec2f, @location(1) texCoords: vec2f) -> VertexOutput {
    var out: VertexOutput;
    out.position = vec4f(position,0.0,1.0);
    out.texCoords = texCoords;
    return out;
}

@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;

@fragment
fn fragmentMain(fragData: VertexOutput) -> @location(0) vec4f {
    return textureSample(tex,textureSampler,fragData.texCoords);    
}