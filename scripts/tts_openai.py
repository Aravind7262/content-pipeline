#!/usr/bin/env python3
# OpenAI TTS 음성 생성 스크립트 — 텍스트 파일을 MP3로 변환
import sys
import json
import argparse
from pathlib import Path


def load_env(env_file):
    env = {}
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, _, value = line.partition('=')
                env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def main():
    parser = argparse.ArgumentParser(description='OpenAI TTS 음성 생성')
    parser.add_argument('--input', required=True, help='입력 텍스트 파일')
    parser.add_argument('--output', required=True, help='출력 MP3 파일')
    parser.add_argument('--voice', default='nova',
                        choices=['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
    parser.add_argument('--model', default='tts-1-hd')
    parser.add_argument('--env-file', required=True)
    args = parser.parse_args()

    # .env 로드
    env_path = Path(args.env_file)
    if not env_path.exists():
        print(json.dumps({"success": False, "error": "ENV_NOT_FOUND",
                          "message": f".env 파일을 찾을 수 없습니다: {args.env_file}"}))
        sys.exit(1)

    env = load_env(args.env_file)
    api_key = env.get('OPENAI_API_KEY')
    if not api_key:
        print(json.dumps({"success": False, "error": "MISSING_KEY",
                          "message": "OPENAI_API_KEY가 .env에 설정되지 않았습니다."}))
        sys.exit(1)

    # 입력 파일 읽기
    input_path = Path(args.input)
    if not input_path.exists():
        print(json.dumps({"success": False, "error": "INPUT_NOT_FOUND",
                          "message": f"입력 파일을 찾을 수 없습니다: {args.input}"}))
        sys.exit(1)

    raw_text = input_path.read_text(encoding='utf-8').strip()

    # 마크다운 파싱 — 순수 나레이션 텍스트만 추출
    lines = []
    for line in raw_text.split('\n'):
        stripped = line.strip()
        # 제거: 헤더(#), 구분선(---), 인용(>), 빈 줄
        if not stripped:
            continue
        if stripped.startswith('#'):
            continue
        if stripped.startswith('---'):
            continue
        if stripped.startswith('>'):
            continue
        lines.append(stripped)
    text = '\n'.join(lines).strip()

    if not text:
        print(json.dumps({"success": False, "error": "EMPTY_INPUT",
                          "message": "입력 파일이 비어 있습니다."}))
        sys.exit(1)

    # OpenAI TTS API 호출 (최대 4096자 제한 → 분할 처리)
    try:
        from openai import OpenAI
    except ImportError:
        print(json.dumps({"success": False, "error": "MISSING_DEPENDENCY",
                          "message": "openai 라이브러리가 필요합니다.\n설치: pip install openai"}))
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 4096자 이하면 한 번에, 초과하면 분할
    MAX_CHARS = 4096
    chunks = []
    if len(text) <= MAX_CHARS:
        chunks = [text]
    else:
        # 문단 단위로 분할
        paragraphs = text.split('\n\n')
        current = ""
        for p in paragraphs:
            if len(current) + len(p) + 2 > MAX_CHARS:
                if current:
                    chunks.append(current)
                current = p
            else:
                current = current + "\n\n" + p if current else p
        if current:
            chunks.append(current)

    try:
        if len(chunks) == 1:
            response = client.audio.speech.create(
                model=args.model, voice=args.voice, input=chunks[0]
            )
            response.stream_to_file(str(output_path))
        else:
            # 분할 생성 후 합치기
            import tempfile
            temp_files = []
            for i, chunk in enumerate(chunks):
                temp_path = output_path.parent / f"_chunk_{i}.mp3"
                response = client.audio.speech.create(
                    model=args.model, voice=args.voice, input=chunk
                )
                response.stream_to_file(str(temp_path))
                temp_files.append(temp_path)

            # ffmpeg로 합치기 (없으면 첫 번째 청크만 사용)
            import subprocess
            list_file = output_path.parent / "_concat_list.txt"
            with open(list_file, 'w') as f:
                for tf in temp_files:
                    f.write(f"file '{tf}'\n")
            result = subprocess.run(
                ['ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                 '-i', str(list_file), '-c', 'copy', str(output_path)],
                capture_output=True, text=True
            )
            # 정리
            for tf in temp_files:
                tf.unlink(missing_ok=True)
            list_file.unlink(missing_ok=True)

            if result.returncode != 0:
                # ffmpeg 실패 시 첫 번째 청크를 결과로
                import shutil
                first_chunk = output_path.parent / "_chunk_0.mp3"
                if first_chunk.exists():
                    shutil.copy2(first_chunk, output_path)

    except Exception as e:
        print(json.dumps({"success": False, "error": "TTS_ERROR",
                          "message": f"TTS 생성 실패: {e}"}))
        sys.exit(1)

    size_kb = round(output_path.stat().st_size / 1024, 1)
    print(json.dumps({
        "success": True,
        "output_path": str(output_path.resolve()),
        "file_size_kb": size_kb,
        "voice": args.voice,
        "model": args.model,
        "chunks": len(chunks)
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
