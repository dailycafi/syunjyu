"""
Vocabulary Difficulty Filter Module
Filters out common/basic vocabulary (CEFR A1-B1 level) to ensure only advanced words are shown.

Based on:
- CEFR (Common European Framework of Reference) levels
- NGSL (New General Service List) - 2800 most common words
- Oxford 3000 core vocabulary

Words in this filter are considered "too easy" for advanced learners.
"""

# Common basic words (A1-B1 level) that should be filtered out
# This is a curated list of the most common English words that AI models
# often incorrectly identify as "advanced vocabulary"

BASIC_VOCABULARY = {
    # Common verbs (A1-B1)
    "be", "is", "are", "was", "were", "been", "being",
    "have", "has", "had", "having",
    "do", "does", "did", "done", "doing",
    "say", "says", "said", "saying",
    "go", "goes", "went", "gone", "going",
    "get", "gets", "got", "gotten", "getting",
    "make", "makes", "made", "making",
    "know", "knows", "knew", "known", "knowing",
    "think", "thinks", "thought", "thinking",
    "take", "takes", "took", "taken", "taking",
    "see", "sees", "saw", "seen", "seeing",
    "come", "comes", "came", "coming",
    "want", "wants", "wanted", "wanting",
    "use", "uses", "used", "using",
    "find", "finds", "found", "finding",
    "give", "gives", "gave", "given", "giving",
    "tell", "tells", "told", "telling",
    "work", "works", "worked", "working",
    "call", "calls", "called", "calling",
    "try", "tries", "tried", "trying",
    "ask", "asks", "asked", "asking",
    "need", "needs", "needed", "needing",
    "feel", "feels", "felt", "feeling",
    "become", "becomes", "became", "becoming",
    "leave", "leaves", "left", "leaving",
    "put", "puts", "putting",
    "mean", "means", "meant", "meaning",
    "keep", "keeps", "kept", "keeping",
    "let", "lets", "letting",
    "begin", "begins", "began", "begun", "beginning",
    "seem", "seems", "seemed", "seeming",
    "help", "helps", "helped", "helping",
    "show", "shows", "showed", "shown", "showing",
    "hear", "hears", "heard", "hearing",
    "play", "plays", "played", "playing",
    "run", "runs", "ran", "running",
    "move", "moves", "moved", "moving",
    "live", "lives", "lived", "living",
    "believe", "believes", "believed", "believing",
    "hold", "holds", "held", "holding",
    "bring", "brings", "brought", "bringing",
    "happen", "happens", "happened", "happening",
    "write", "writes", "wrote", "written", "writing",
    "provide", "provides", "provided", "providing",
    "sit", "sits", "sat", "sitting",
    "stand", "stands", "stood", "standing",
    "lose", "loses", "lost", "losing",
    "pay", "pays", "paid", "paying",
    "meet", "meets", "met", "meeting",
    "include", "includes", "included", "including",
    "continue", "continues", "continued", "continuing",
    "set", "sets", "setting",
    "learn", "learns", "learned", "learnt", "learning",
    "change", "changes", "changed", "changing",
    "lead", "leads", "led", "leading",
    "understand", "understands", "understood", "understanding",
    "watch", "watches", "watched", "watching",
    "follow", "follows", "followed", "following",
    "stop", "stops", "stopped", "stopping",
    "create", "creates", "created", "creating",
    "speak", "speaks", "spoke", "spoken", "speaking",
    "read", "reads", "reading",
    "allow", "allows", "allowed", "allowing",
    "add", "adds", "added", "adding",
    "spend", "spends", "spent", "spending",
    "grow", "grows", "grew", "grown", "growing",
    "open", "opens", "opened", "opening",
    "walk", "walks", "walked", "walking",
    "win", "wins", "won", "winning",
    "offer", "offers", "offered", "offering",
    "remember", "remembers", "remembered", "remembering",
    "love", "loves", "loved", "loving",
    "consider", "considers", "considered", "considering",
    "appear", "appears", "appeared", "appearing",
    "buy", "buys", "bought", "buying",
    "wait", "waits", "waited", "waiting",
    "serve", "serves", "served", "serving",
    "die", "dies", "died", "dying",
    "send", "sends", "sent", "sending",
    "expect", "expects", "expected", "expecting",
    "build", "builds", "built", "building",
    "stay", "stays", "stayed", "staying",
    "fall", "falls", "fell", "fallen", "falling",
    "cut", "cuts", "cutting",
    "reach", "reaches", "reached", "reaching",
    "kill", "kills", "killed", "killing",
    "remain", "remains", "remained", "remaining",
    "suggest", "suggests", "suggested", "suggesting",
    "raise", "raises", "raised", "raising",
    "pass", "passes", "passed", "passing",
    "sell", "sells", "sold", "selling",
    "require", "requires", "required", "requiring",
    "report", "reports", "reported", "reporting",
    "decide", "decides", "decided", "deciding",
    "pull", "pulls", "pulled", "pulling",
    
    # Common nouns (A1-B1)
    "time", "year", "people", "way", "day", "man", "woman", "child", "children",
    "world", "life", "hand", "part", "place", "case", "week", "company", "system",
    "program", "question", "work", "government", "number", "night", "point", "home",
    "water", "room", "mother", "area", "money", "story", "fact", "month", "lot",
    "right", "study", "book", "eye", "job", "word", "business", "issue", "side",
    "kind", "head", "house", "service", "friend", "father", "power", "hour", "game",
    "line", "end", "member", "law", "car", "city", "community", "name", "president",
    "team", "minute", "idea", "kid", "body", "information", "back", "parent", "face",
    "others", "level", "office", "door", "health", "person", "art", "war", "history",
    "party", "result", "change", "morning", "reason", "research", "girl", "guy",
    "moment", "air", "teacher", "force", "education", "foot", "boy", "age", "policy",
    "process", "music", "market", "sense", "nation", "plan", "college", "interest",
    "death", "experience", "effect", "use", "class", "control", "care", "field",
    "development", "role", "effort", "rate", "heart", "drug", "show", "leader",
    "light", "voice", "wife", "police", "mind", "difference", "period", "building",
    "action", "problem", "bank", "order", "road", "table", "court", "event",
    
    # Common adjectives (A1-B1)
    "good", "new", "first", "last", "long", "great", "little", "own", "other",
    "old", "right", "big", "high", "different", "small", "large", "next", "early",
    "young", "important", "few", "public", "bad", "same", "able", "human", "local",
    "sure", "free", "better", "true", "whole", "real", "best", "hard", "special",
    "easy", "clear", "recent", "certain", "personal", "open", "red", "difficult",
    "available", "likely", "short", "single", "medical", "current", "wrong", "private",
    "past", "foreign", "fine", "common", "poor", "natural", "significant", "similar",
    "hot", "dead", "central", "happy", "serious", "ready", "simple", "left", "physical",
    "general", "environmental", "financial", "blue", "democratic", "dark", "various",
    "entire", "close", "legal", "religious", "cold", "final", "main", "green",
    "nice", "huge", "popular", "traditional", "cultural", "strong", "possible",
    "economic", "federal", "international", "full", "low", "late", "basic",
    
    # Common adverbs (A1-B1)
    "up", "so", "out", "just", "now", "how", "then", "more", "also", "here",
    "well", "only", "very", "even", "back", "there", "down", "still", "in",
    "as", "to", "when", "never", "really", "most", "over", "such", "through",
    "new", "however", "often", "always", "away", "actually", "again", "far",
    "today", "already", "yet", "later", "much", "once", "least", "ago", "together",
    "probably", "ever", "perhaps", "almost", "hard", "certainly", "sometimes",
    "especially", "soon", "finally", "quickly", "clearly", "recently", "else",
    "rather", "quite", "along", "exactly", "usually", "instead", "early",
    "nearly", "simply", "generally", "directly", "thus", "indeed", "often",
    
    # Common prepositions and conjunctions
    "of", "to", "in", "for", "on", "with", "at", "by", "from", "or", "an", "be",
    "this", "which", "but", "not", "what", "all", "were", "we", "when", "your",
    "can", "had", "have", "been", "if", "each", "about", "into", "than", "its",
    "no", "way", "could", "my", "than", "first", "been", "who", "may", "after",
    "should", "would", "these", "her", "him", "both", "between", "must", "because",
    "those", "us", "off", "being", "our", "before", "through", "most", "where",
    "while", "against", "during", "without", "though", "within", "since", "under",
    
    # Pronouns
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs",
    "myself", "yourself", "himself", "herself", "itself", "ourselves", "themselves",
    "this", "that", "these", "those", "who", "whom", "whose", "which", "what",
    
    # Numbers and quantifiers
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "hundred", "thousand", "million", "billion", "first", "second", "third",
    "many", "much", "some", "any", "few", "several", "all", "both", "each", "every",
    "another", "other", "more", "most", "less", "least", "enough",
    
    # Common technical terms that are NOT advanced vocabulary
    # (Often mistakenly selected by AI as "advanced")
    "data", "model", "system", "process", "user", "tool", "code", "file", "test",
    "app", "web", "site", "page", "link", "button", "form", "input", "output",
    "search", "result", "list", "item", "view", "click", "type", "save", "load",
    "update", "delete", "create", "add", "remove", "edit", "copy", "paste",
    "start", "stop", "run", "build", "deploy", "launch", "release", "version",
    "feature", "function", "method", "class", "object", "variable", "value",
    "string", "number", "array", "list", "table", "database", "server", "client",
    "request", "response", "error", "warning", "message", "log", "debug",
    "config", "setting", "option", "parameter", "argument", "return", "import",
    "export", "module", "package", "library", "framework", "platform", "service",
    "api", "sdk", "cli", "gui", "ui", "ux", "frontend", "backend", "fullstack",
    "cloud", "local", "remote", "online", "offline", "sync", "async",
    
    # B1-B2 commonly misidentified words
    "achieve", "approach", "available", "benefit", "challenge", "communicate",
    "community", "consider", "create", "current", "design", "develop", "development",
    "discover", "discuss", "environment", "establish", "evaluate", "experience",
    "explore", "focus", "generate", "identify", "improve", "increase", "influence",
    "involve", "maintain", "manage", "method", "occur", "opportunity", "organize",
    "participate", "perform", "potential", "practice", "prepare", "present",
    "previous", "primary", "principle", "produce", "professional", "project",
    "promote", "provide", "purpose", "quality", "range", "receive", "recognize",
    "recommend", "reduce", "relate", "relationship", "represent", "require",
    "resource", "respond", "response", "responsible", "result", "review", "role",
    "section", "select", "significant", "similar", "situation", "solution",
    "source", "specific", "strategy", "structure", "success", "successful",
    "suggest", "support", "technology", "theory", "traditional", "transfer",
    "understand", "unique", "utilize", "various", "version",
    
    # Additional B1-B2 words that are commonly misidentified as advanced
    # These are common academic/professional vocabulary that most intermediate learners know
    "comprehensive", "comprehensively",
    "systematic", "systematically",
    "thorough", "thoroughly",
    "flexibility", "flexible", "flexibly",
    "enable", "enables", "enabled", "enabling",
    "enhance", "enhances", "enhanced", "enhancing", "enhancement",
    "ensure", "ensures", "ensured", "ensuring",
    "demonstrate", "demonstrates", "demonstrated", "demonstrating", "demonstration",
    "analyze", "analyzes", "analyzed", "analyzing", "analysis",
    "efficient", "efficiency", "efficiently",
    "effective", "effectiveness", "effectively",
    "reliable", "reliability", "reliably",
    "consistent", "consistency", "consistently",
    "dynamic", "dynamically",
    "intuitive", "intuitively",
    "versatile", "versatility",
    "optimal", "optimally",
    "crucial", "crucially",
    "essential", "essentially",
    "fundamental", "fundamentally",
    "significant", "significantly",
    "substantial", "substantially",
    "considerable", "considerably",
    "remarkable", "remarkably",
    "exceptional", "exceptionally",
    "outstanding", "outstandingly",
    "impressive", "impressively",
    "innovative", "innovatively", "innovation",
    "creative", "creatively", "creativity",
    "strategic", "strategically",
    "practical", "practically",
    "theoretical", "theoretically",
    "technical", "technically",
    "professional", "professionally",
    "academic", "academically",
    
    # Common phrasal verbs (often incorrectly marked as advanced)
    "look up", "look for", "look at", "look into", "look after",
    "get up", "get out", "get in", "get on", "get off", "get back", "get over",
    "go on", "go out", "go back", "go up", "go down", "go through",
    "come up", "come back", "come out", "come in", "come on",
    "take up", "take out", "take off", "take on", "take over",
    "put on", "put off", "put up", "put down", "put out",
    "turn on", "turn off", "turn up", "turn down", "turn out",
    "set up", "set out", "set off", "set down",
    "give up", "give in", "give out", "give back",
    "make up", "make out", "make off",
    "break up", "break down", "break out", "break in",
    "carry on", "carry out", "carry off",
    "bring up", "bring out", "bring back", "bring down",
    "pick up", "pick out", "pick on",
    "work out", "work on", "work up",
    "find out", "figure out", "point out", "check out",
}

# Words that are commonly used in tech articles but are NOT advanced English vocabulary
# These are technical jargon that shouldn't be taught as "English vocabulary"
TECH_BUZZWORDS = {
    # AI/ML terms (technical jargon, not English vocabulary)
    "ai", "ml", "llm", "gpt", "bert", "transformer", "neural", "network",
    "deep", "learning", "machine", "algorithm", "training", "inference",
    "model", "dataset", "parameter", "weight", "bias", "gradient", "epoch",
    "batch", "layer", "activation", "embedding", "attention", "token",
    "prompt", "fine-tune", "pretrain", "benchmark", "accuracy", "precision",
    "recall", "f1", "loss", "optimizer", "hyperparameter", "overfitting",
    "underfitting", "regularization", "dropout", "normalization",
    "subagent", "subagents", "agent", "agents",
    
    # Software/Tech terms
    "api", "sdk", "cli", "gui", "ide", "devops", "cicd", "docker", "kubernetes",
    "microservice", "serverless", "cloud", "aws", "azure", "gcp", "saas", "paas",
    "iaas", "backend", "frontend", "fullstack", "database", "sql", "nosql",
    "cache", "cdn", "dns", "http", "https", "rest", "graphql", "websocket",
    "oauth", "jwt", "encryption", "authentication", "authorization",
    "scalability", "availability", "latency", "throughput",
    "bandwidth", "storage", "compute", "memory", "cpu", "gpu", "tpu",
    "deploy", "deployment", "deployments", "deployed", "deploying",
    "spawn", "spawns", "spawned", "spawning",
    "bundle", "bundles", "bundled", "bundling",
    "iterate", "iterates", "iterated", "iterating", "iteration", "iterations",
    "optimize", "optimizes", "optimized", "optimizing", "optimization",
    "configure", "configures", "configured", "configuring", "configuration",
    "customize", "customizes", "customized", "customizing", "customization",
    "integrate", "integrates", "integrated", "integrating", "integration",
    "implement", "implements", "implemented", "implementing", "implementation",
    "execute", "executes", "executed", "executing", "execution",
    "automate", "automates", "automated", "automating", "automation",
    "delegate", "delegates", "delegated", "delegating", "delegation",
    "orchestrate", "orchestrates", "orchestrated", "orchestrating", "orchestration",
    "leverage", "leverages", "leveraged", "leveraging",
    "streamline", "streamlines", "streamlined", "streamlining",
    "capability", "capabilities",
    "functionality", "functional",
    "component", "components",
    "mechanism", "mechanisms",
    "framework", "frameworks",
    "architecture", "architectural",
    "infrastructure",
    "scalable", "scalability",
    "robust", "robustness",
    "modular", "modularity",
    "seamless", "seamlessly",
    "runtime", "filesystem", "workflow", "workflows",
    
    # Business buzzwords
    "enterprise", "startup", "unicorn", "vc", "funding", "valuation", "ipo",
    "revenue", "profit", "margin", "growth", "scale", "pivot", "disrupt",
    "innovate", "synergy", "agile",
    "lean", "mvp", "kpi", "roi", "b2b", "b2c", "marketplace",
    "ecosystem", "platform", "solution", "digitalization", "transformation",
}


def is_basic_vocabulary(word: str) -> bool:
    """
    Check if a word is basic vocabulary (CEFR A1-B1 level).
    Returns True if the word should be filtered out.
    """
    if not word:
        return True
    
    word_lower = word.lower().strip()
    
    # Check single word
    if word_lower in BASIC_VOCABULARY:
        return True
    
    # Check tech buzzwords
    if word_lower in TECH_BUZZWORDS:
        return True
    
    # Check if it's a phrase - check each word
    words = word_lower.split()
    if len(words) > 1:
        # For phrases, check if ALL words are basic
        # If so, it's likely a basic phrase
        basic_count = sum(1 for w in words if w in BASIC_VOCABULARY or w in TECH_BUZZWORDS)
        # If more than 60% of words are basic, consider it basic
        if basic_count / len(words) > 0.6:
            return True
    
    # Additional heuristics:
    # 1. Very short words (1-2 letters) are usually basic
    if len(word_lower) <= 2:
        return True
    
    # 2. Words ending with common suffixes that are still basic
    basic_suffixes = ['ing', 'ed', 'er', 'est', 'ly', 'tion', 'ness']
    for suffix in basic_suffixes:
        if word_lower.endswith(suffix):
            root = word_lower[:-len(suffix)]
            if root in BASIC_VOCABULARY:
                return True
    
    return False


def filter_vocabulary(vocabulary_list: list) -> list:
    """
    Filter a list of vocabulary items, removing basic/common words.
    
    Args:
        vocabulary_list: List of vocabulary items, each with a 'term' key
        
    Returns:
        Filtered list with only advanced vocabulary
    """
    filtered = []
    for item in vocabulary_list:
        term = item.get("term", "")
        if not is_basic_vocabulary(term):
            filtered.append(item)
    
    return filtered


# =============================================================================
# AI Tech Mode Filtering
# =============================================================================

# Basic/common tech terms that are too elementary for AI Tech learners
# These are terms that any tech professional should already know
BASIC_TECH_VOCABULARY = {
    # Extremely common programming terms (everyone knows these)
    "data", "code", "file", "files", "folder", "directory", "path",
    "function", "method", "class", "object", "variable", "value", "type",
    "string", "number", "integer", "float", "boolean", "array", "list",
    "loop", "if", "else", "return", "import", "export", "module",
    "input", "output", "print", "read", "write", "save", "load",
    "create", "delete", "update", "add", "remove", "get", "set",
    "start", "stop", "run", "build", "test", "debug", "error", "bug",
    "user", "admin", "login", "logout", "password", "username",
    "button", "click", "form", "page", "link", "url", "web", "site",
    "app", "application", "software", "program", "tool", "system",
    "server", "client", "request", "response", "api", "endpoint",
    "database", "table", "row", "column", "query", "sql",
    "version", "release", "update", "install", "download", "upload",
    "config", "setting", "option", "parameter", "argument",
    "true", "false", "null", "none", "empty", "default",
    "key", "value", "pair", "map", "dict", "dictionary",
    "index", "count", "size", "length", "width", "height",
    "name", "id", "title", "description", "content", "text",
    "image", "video", "audio", "media", "format",
    "local", "remote", "online", "offline",
    "open", "close", "new", "old", "next", "previous",
    "enable", "disable", "active", "inactive",
    "public", "private", "protected", "static",
    "sync", "async", "wait", "timeout",
    "log", "logs", "logging", "message", "warning",
    "success", "fail", "failure", "complete", "pending",
    
    # Common but basic AI/ML terms (too basic for AI Tech learners)
    "ai", "ml", "model", "models", "data", "dataset", "datasets",
    "train", "training", "test", "testing", "predict", "prediction",
    "input", "output", "layer", "layers", "network", "networks",
    "learn", "learning", "deep", "neural",
    "accuracy", "loss", "error", "score",
    "feature", "features", "label", "labels",
    "batch", "epoch", "epochs",
    "gpu", "cpu", "memory", "compute",
    
    # Generic business/tech terms
    "company", "business", "product", "service", "customer", "user",
    "team", "project", "task", "work", "job", "role",
    "cost", "price", "budget", "revenue", "profit",
    "plan", "strategy", "goal", "target", "result",
    "report", "analysis", "review", "feedback",
    "meeting", "call", "email", "message",
    "document", "docs", "documentation",
    "process", "workflow", "pipeline",
    "deploy", "deployment", "production", "staging",
    "cloud", "aws", "azure", "gcp", "google",
    "platform", "framework", "library", "package",
    "open-source", "opensource", "free", "paid",
}

# Advanced/valuable tech terms that SHOULD be kept for AI Tech learners
# These are terms that have nuanced meanings worth learning
ADVANCED_TECH_VOCABULARY = {
    # Architecture & Design Patterns
    "idempotent", "idempotency", "deterministic", "stochastic",
    "heuristic", "heuristics", "polymorphism", "encapsulation",
    "abstraction", "inheritance", "composition", "aggregation",
    "singleton", "factory", "observer", "decorator", "facade",
    "monolithic", "microservices", "serverless", "event-driven",
    "eventual consistency", "strong consistency", "cap theorem",
    "sharding", "partitioning", "replication", "redundancy",
    
    # AI/ML Advanced Terms
    "hallucination", "hallucinations", "confabulation",
    "emergent", "emergence", "emergent behavior",
    "alignment", "misalignment", "value alignment",
    "interpretability", "explainability", "black-box",
    "adversarial", "perturbation", "robustness",
    "generalization", "overfitting", "underfitting",
    "inductive bias", "prior", "posterior",
    "latent", "latent space", "manifold",
    "ablation", "ablation study",
    "contrastive", "contrastive learning",
    "self-supervised", "semi-supervised", "unsupervised",
    "few-shot", "zero-shot", "in-context learning",
    "chain-of-thought", "reasoning", "inference",
    "tokenization", "embedding", "attention mechanism",
    "transformer", "encoder", "decoder",
    "fine-tuning", "transfer learning", "domain adaptation",
    "reinforcement learning", "reward shaping", "rlhf",
    "distillation", "knowledge distillation", "pruning", "quantization",
    
    # System Design & Infrastructure
    "throughput", "latency", "bottleneck", "saturation",
    "backpressure", "circuit breaker", "bulkhead",
    "failover", "failback", "disaster recovery",
    "observability", "telemetry", "tracing", "profiling",
    "containerization", "orchestration", "service mesh",
    "load balancing", "rate limiting", "throttling",
    "caching", "invalidation", "cache coherence",
    "consensus", "quorum", "leader election",
    "linearizability", "serializability", "isolation level",
    
    # Security & Cryptography
    "cryptographic", "encryption", "decryption",
    "hash", "hashing", "collision", "collision resistance",
    "authentication", "authorization", "access control",
    "zero-trust", "principle of least privilege",
    "vulnerability", "exploit", "mitigation",
    "sandboxing", "isolation", "containment",
    
    # Data Engineering
    "schema", "schema evolution", "schema registry",
    "data lineage", "data provenance", "data governance",
    "etl", "elt", "data pipeline", "data lake", "data warehouse",
    "streaming", "batch processing", "real-time",
    "exactly-once", "at-least-once", "at-most-once",
    "backfill", "replay", "idempotent processing",
}


def is_basic_tech_vocabulary(word: str) -> bool:
    """
    Check if a word is basic tech vocabulary that AI Tech learners already know.
    Returns True if the word should be filtered out.
    """
    if not word:
        return True
    
    word_lower = word.lower().strip()
    
    # If it's in the advanced vocabulary list, keep it
    if word_lower in ADVANCED_TECH_VOCABULARY:
        return False
    
    # Check if it's basic tech vocabulary
    if word_lower in BASIC_TECH_VOCABULARY:
        return True
    
    # Check if it's a very common English word (from BASIC_VOCABULARY)
    if word_lower in BASIC_VOCABULARY:
        return True
    
    # Very short terms are usually too basic
    if len(word_lower) <= 3:
        return True
    
    return False


def filter_tech_vocabulary(vocabulary_list: list) -> list:
    """
    Filter vocabulary for AI Tech mode.
    Removes basic tech terms that professionals already know.
    
    Args:
        vocabulary_list: List of vocabulary items, each with a 'term' key
        
    Returns:
        Filtered list with only valuable tech vocabulary
    """
    filtered = []
    for item in vocabulary_list:
        term = item.get("term", "")
        if not is_basic_tech_vocabulary(term):
            filtered.append(item)
    
    return filtered


def get_word_difficulty_level(word: str) -> str:
    """
    Get an estimated difficulty level for a word.
    
    Returns:
        'A1-A2' for basic words
        'B1-B2' for intermediate words  
        'C1-C2' for advanced words (estimated)
    """
    if not word:
        return 'unknown'
    
    word_lower = word.lower().strip()
    
    if word_lower in BASIC_VOCABULARY:
        return 'A1-A2'
    
    if word_lower in TECH_BUZZWORDS:
        return 'technical'
    
    # Heuristics for intermediate vs advanced
    # This is a rough estimate - for accurate classification,
    # you'd need a proper CEFR-tagged dictionary
    
    # Longer words tend to be more advanced
    if len(word_lower) >= 10:
        return 'C1-C2'
    
    # Words with Latin/Greek roots tend to be more advanced
    advanced_patterns = [
        'tion', 'sion', 'ment', 'ance', 'ence', 'ity', 'ous', 'ious',
        'eous', 'ful', 'less', 'able', 'ible', 'ive', 'ary', 'ory',
        'ism', 'ist', 'ize', 'ise', 'ify', 'ology', 'ography', 'pathy',
        'phobia', 'philia', 'cracy', 'crat', 'arch', 'archy'
    ]
    
    for pattern in advanced_patterns:
        if pattern in word_lower:
            return 'B2-C1'
    
    return 'B1-B2'
