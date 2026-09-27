import katex from 'katex'

// The source uses both TeX groups and printed Unicode indices. Normalize only
// the latter so KaTeX can size radicals and nested fractions as one expression.
const subscript = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ₓ':'x','ᵧ':'y'}
const superscript = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'}

export function toLatex(expression){
  return expression
    .replace(/[₀₁₂₃₄₅₆₇₈₉ₓᵧ]+/g, value=>`_{${[...value].map(char=>subscript[char]).join('')}}`)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, value=>`^{${[...value].map(char=>superscript[char]).join('')}}`)
    .replaceAll('−','-').replaceAll('×','\\times ').replaceAll('·','\\cdot ')
    .replaceAll('Σ','\\Sigma ').replaceAll('→','\\to ').replaceAll('⇒','\\Rightarrow ')
    .replaceAll('∞','\\infty ').replaceAll('…','\\ldots ')
    .replaceAll('°','^{\\circ}')
    .replace(/\bsin\b/g,'\\sin').replace(/\btg\b/g,'\\operatorname{tg}')
    .replace(/\bconst\b/g,'\\text{const}')
}

export function renderFormula(expression){
  return katex.renderToString(toLatex(expression),{throwOnError:true,output:'htmlAndMathml',strict:'ignore'})
}
