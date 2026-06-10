/*import { NextResponse } from "next/server";

// Response set 1 (concise, structured)
const RESPONSE_SET_1: Record<string, string> = {
  "vật lý lượng tử là gì":
    "Vật lý lượng tử là phân ngành vật lý nghiên cứu các hiện tượng ở quy mô nguyên tử và hạ nguyên tử. Điểm cốt lõi là tính lưỡng tính sóng-hạt và nguyên lý bất định Heisenberg, nơi các thực thể có thể tồn tại ở nhiều trạng thái cùng lúc cho đến khi được đo lường.",
  "thuật toán quicksort là gì":
    "Quicksort là thuật toán sắp xếp dùng kỹ thuật chia để trị. Nó chọn một phần tử chốt (pivot), chia mảng thành hai phần nhỏ hơn và lớn hơn pivot, rồi đệ quy sắp xếp từng phần. Độ phức tạp trung bình là O(n log n).",
  "kinh tế vĩ mô là gì":
    "Kinh tế vĩ mô nghiên cứu toàn bộ nền kinh tế thông qua các chỉ số tổng hợp như GDP, lạm phát và thất nghiệp. Chính sách tài khóa — bao gồm thuế và chi tiêu chính phủ — là công cụ chính để điều tiết tăng trưởng kinh tế.",
  "what is machine learning":
    "Machine learning is a subset of AI where algorithms learn patterns from data without explicit programming. The model adjusts internal parameters during training to minimize errors, enabling accurate predictions on new unseen data.",
  "what is blockchain":
    "Blockchain is a decentralized ledger that records transactions in cryptographically linked blocks across a peer-to-peer network. No single entity controls it, making it tamper-resistant and transparent by design.",
  "what is climate change":
    "Climate change refers to long-term shifts in global temperatures and weather patterns, primarily caused by human activities. Burning fossil fuels releases CO2 and other greenhouse gases that trap heat in the atmosphere, driving global warming.",
  "what is deep learning":
    "Deep learning is a subset of machine learning that uses multi-layered neural networks to automatically extract features from raw data. It excels at tasks like image recognition, speech processing, and natural language understanding.",
  "what is the internet of things":
    "The Internet of Things (IoT) refers to the network of physical devices embedded with sensors and connectivity that collect and exchange data. Examples include smart home devices, wearables, and industrial sensors.",
  "what is cybersecurity":
    "Cybersecurity is the practice of protecting digital systems, networks, and data from unauthorized access and attacks. It encompasses network security, endpoint protection, encryption, and identity management.",
  "what is cloud computing":
    "Cloud computing delivers computing services over the internet on demand. It enables scalability and cost efficiency by eliminating the need for on-premise hardware infrastructure.",
  default:
    "Artificial intelligence is the simulation of human intelligence by computer systems. It encompasses machine learning, natural language processing, and computer vision to enable machines to perform tasks that typically require human cognition.",
};

// Response set 2 (detailed, analytical)
const RESPONSE_SET_2: Record<string, string> = {
  "vật lý lượng tử là gì":
    "Vật lý lượng tử là lý thuyết nền tảng mô tả hành vi của vật chất và ánh sáng ở cấp độ hạt cơ bản. Khác với vật lý cổ điển, năng lượng tồn tại dưới dạng các gói rời rạc gọi là lượng tử (quanta). Hiện tượng vướng víu lượng tử cho phép các hạt tương tác tức thời dù cách xa nhau.",
  "thuật toán quicksort là gì":
    "Quicksort là một trong những thuật toán sắp xếp phổ biến nhất với hiệu suất trung bình O(n log n). Bằng cách chọn pivot và phân hoạch mảng, nó sắp xếp đệ quy các phần con. Tuy nhiên trường hợp xấu nhất đạt O(n²) khi pivot luôn là phần tử cực trị — có thể tránh bằng cách chọn pivot ngẫu nhiên.",
  "kinh tế vĩ mô là gì":
    "Kinh tế vĩ mô phân tích nền kinh tế ở quy mô quốc gia và toàn cầu thông qua các mô hình tổng cung - tổng cầu. Chu kỳ kinh tế, chính sách tiền tệ của ngân hàng trung ương, và các cú sốc bên ngoài đều tác động đến sản lượng và mức giá chung của nền kinh tế.",
  "what is machine learning":
    "Machine learning enables systems to learn and improve from experience without being explicitly programmed. Through training on large datasets and optimization via backpropagation, neural networks develop internal representations that generalize across domains — from recommendation systems to medical diagnosis.",
  "what is blockchain":
    "Blockchain is a distributed immutable ledger where data is grouped into blocks, each containing a cryptographic hash of the previous block. Consensus mechanisms like Proof of Work or Proof of Stake validate transactions without central authority, enabling trustless peer-to-peer value transfer.",
  "what is climate change":
    "Climate change encompasses both natural variability and human-induced alterations to Earth's climate system. Anthropogenic greenhouse gas emissions intensify the greenhouse effect, causing ocean acidification, ice melt, and increasingly severe weather events that threaten ecosystems worldwide.",
  "what is deep learning":
    "Deep learning leverages hierarchical neural network architectures to learn increasingly abstract representations of data. Convolutional networks excel at vision tasks while transformers revolutionized NLP. The key advantage is automatic feature extraction, eliminating manual feature engineering.",
  "what is the internet of things":
    "IoT creates an interconnected ecosystem of physical objects embedded with sensors and communication modules that collect real-time data. From smart cities to precision agriculture, IoT enables data-driven automation and monitoring at unprecedented scale across industries.",
  "what is cybersecurity":
    "Cybersecurity is a multi-layered discipline encompassing technical controls, processes, and human factors to protect digital assets. Modern threats include ransomware, supply chain attacks, and state-sponsored intrusions. Zero-trust architecture and AI-powered threat detection represent the current frontiers of defense.",
  "what is cloud computing":
    "Cloud computing provides on-demand access to shared computing resources via the internet, following service models: IaaS, PaaS, and SaaS. Major providers enable global scalability, disaster recovery, and pay-per-use pricing that transformed how software is built and deployed worldwide.",
  default:
    "Artificial intelligence encompasses a broad range of techniques that enable machines to exhibit intelligent behavior. From symbolic reasoning to modern deep learning, AI systems now surpass human performance in specific domains like image recognition and protein structure prediction, raising profound questions about the future of work.",
};

// Track which call is first or second for the same prompt
const callTracker: Record<string, number> = {};

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const normalized = prompt?.toLowerCase().trim().replace(/[?!.]+$/, "");

    // First call gets set 1, second call gets set 2, then resets
    if (!callTracker[normalized] || callTracker[normalized] === 2) {
      callTracker[normalized] = 1;
    } else {
      callTracker[normalized] = 2;
    }

    const responses =
      callTracker[normalized] === 1 ? RESPONSE_SET_1 : RESPONSE_SET_2;
    const text = responses[normalized] ?? responses["default"];

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("GENERATE ROUTE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}*/
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Different system prompts to simulate different AI personalities
const SYSTEM_PROMPTS: Record<string, string> = {
  ChatGPT: `You are ChatGPT, a helpful AI assistant made by OpenAI. 
You are known for being concise, structured, and clear. 
Answer the following question as ChatGPT would.`,

  Gemini: `You are Gemini, a helpful AI assistant made by Google. 
You are known for being thorough, analytical, and detail-oriented. 
Answer the following question as Gemini would.`,
};

export async function POST(req: Request) {
  try {
    console.log("GENERATE ROUTE START");

    const body = await req.json();
    const prompt = body.prompt || "";
    const modelName = body.model || "Gemini";

    console.log("PROMPT:", prompt);
    console.log("MODEL:", modelName);

    const systemPrompt = SYSTEM_PROMPTS[modelName] || SYSTEM_PROMPTS["Gemini"];

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    console.log("CALLING GEMINI...");

    const result = await model.generateContent(prompt);

    console.log("GEMINI SUCCESS");

    const text = result.response.text();

    if (!text) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("GENERATE ROUTE ERROR:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed.",
      },
      { status: 500 }
    );
  }
}