[![Phrame](https://badgen.net/github/release/jakowenko/phrame/stable)](https://github.com/jakowenko/phrame) [![Phrame](https://badgen.net/github/stars/jakowenko/phrame)](https://github.com/jakowenko/phrame/stargazers) [![Docker Pulls](https://flat.badgen.net/docker/pulls/jakowenko/phrame)](https://hub.docker.com/r/jakowenko/phrame) [![Discord](https://flat.badgen.net/discord/members/EeVrVrCkWZ?label=Discord)](https://discord.gg/EeVrVrCkWZ)

# Phrame

Phrame generates captivating and unique art by listening to conversations around it, transforming spoken words and emotions into visually stunning masterpieces. Unleash your creativity and transform the soundscape around you.

<p align="center">
  <img width="50%" src="https://github.com/jakowenko/phrame/assets/1081811/3162f563-9c10-4fe9-b004-e4760bcd6dfc"><img width="50%" src="https://github.com/jakowenko/phrame/assets/1081811/3a16bc5e-781a-4997-ae14-b1cdadcdb498">
  <img width="33.33%" src="https://github.com/jakowenko/phrame/assets/1081811/42816efd-7ade-4d98-a753-55b261d86bc8"><img width="33.33%" src="https://github.com/jakowenko/phrame/assets/1081811/3476b713-755b-43d0-8283-6f19804b2067"><img width="33.33%" src="https://github.com/jakowenko/phrame/assets/1081811/16ae47f6-40bb-4de6-b46e-ef065a2b5258">
</p>

## How

Phrame relies on the [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) interface of the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) to transform audio into text. This text is processed by OpenAI, producing a condensed summary. The summary is then combined with the configured generative AI image services and the final images are saved.

## Donations

If you would like to make a donation to support development, please use [GitHub Sponsors](https://github.com/sponsors/jakowenko).

## Features

- Create unique AI-generated artwork from spoken conversations
- Automatic, manual or voice-activated summary generation for on-demand art
- User-friendly UI, optimized for both desktop and mobile
- Real-time updates and remote control via WebSockets
- Integrated config editor for customization
- Support for multiple generative [AI image services](#supported-ais)
- [Voice commands](#voice-commands) for image generation and navigation
- Manage your gallery effortlessly: browse, favorite, delete images, and navigate using keyboard shortcuts
- Access and manage logs for efficient troubleshooting

## Supported Architecture

- amd64
- arm64

## Supported AIs

- [OpenAI](https://openai.com)
- [Midjourney](https://midjourney.com)\*
- [Stability AI](https://stability.ai)
- [Dream](https://dream.ai)
- [DeepAI](https://deepai.org)
- [Leonardo.Ai](https://leonardo.ai)

\* _Midjourney currently uses an unofficial third party [package](https://github.com/erictik/midjourney-client). Use this integration at your own risk._

## Voice Commands

Activate the microphone to interact with Phrame using the following voice commands.

| Command          | Action                                 |
| ---------------- | -------------------------------------- |
| `Hey Phrame`     | Wake word to generate images on demand |
| `Next Image`     | Advance to next image                  |
| `Previous Image` | Advance to previous image              |
| `Last Image`     | Advance to previous image              |

## UI

Phrame has a responsive UI available at [localhost:3000](http://localhost:3000).

| Path          | Name                              |
| ------------- | --------------------------------- |
| `/`           | Controller                        |
| `/phrame?mic` | Phrame with microphone support    |
| `/phrame`     | Phrame without microphone support |
| `/gallery`    | Gallery                           |
| `/config`     | Config                            |
| `/logs`       | Logs                              |

## Privacy

Speech recognition in Phrame is managed by the browser. The handling of audio data for speech recognition depends on the specific browser used. For instance, Chrome takes the audio and sends it to [Google's servers](https://google.com/chrome/privacy/whitepaper.html#speech) to perform the transcription. It is encouraged to review the privacy policy of your chosen browser to fully understand how speech data is handled.

Once transcribed, Phrame saves these transcriptions into a local database. They are then processed by OpenAI to generate a summary, and immediately after, the original transcriptions are deleted. This summary is used in conjunction with the configured generative AI image services and the final pieces of art are saved locally.

It's important to clarify that Phrame does not retain or transmit your transcripts beyond the local device, except for the brief period required for generating the summary through OpenAI. Apart from these specific instances, no personal data is used, stored, or transmitted for any other purposes.

## Usage

Phrame operates as a single Docker container and is easily accessible using any modern browser, even without a microphone.

To take advantage of the speech recognition feature, a [compatible browser](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition#browser_compatibility) and microphone are required. At this time Chrome and Safari are the only browsers that support speech recognition.

Artwork within Phrame is displayed according to the `image.order` value. The latest summary and any favorite images are seamlessly merged, providing an evolving canvas of unique AI-generated art. As new images are created, they are instantly displayed by Phrame.

### Quick Start

1. Start Phrame
2. Go to [localhost:3000/config](http://localhost:3000/config)
   1. Add your [OpenAI API key](#openai) and save
   2. Verify OpenAI shows as configured with a green circle
3. In a new window go to [localhost:3000/phrame?mic](http://localhost:3000/phrame?mic) and follow the on screen instructions
4. Go to [localhost:3000](http://localhost:3000) and verify the microphone and speech recognition are working

### Docker Run

```bash
docker run -d --restart=unless-stopped --name=phrame -v phrame:/.storage -p 3000:3000 jakowenko/phrame
```

### Docker Compose

```yaml
version: '3.9'

volumes:
  phrame:

services:
  phrame:
    container_name: phrame
    image: jakowenko/phrame
    restart: unless-stopped
    volumes:
      - phrame:/.storage
    ports:
      - 3000:3000
```

### Launch on Boot

Modern browsers require a user click to access the microphone. To automatically start Phrame on boot, you can use the following script. This requires [ydotool](https://github.com/ReimuNotMoe/ydotool) or [xdotool](https://github.com/jordansissel/xdotool) (depending on your display server) to be installed which allows you to simulate keyboard input and mouse activity.

The script will wait 15 seconds for the Docker Engine and Phrame to start before launching Chrome. You can adjust the delay by changing the `sleep` value. After launching the browser, the script will wait 5 seconds before sending a click to get microphone access and start speech recognition.

Depending on your system, you may need to adjust the path to Chrome.

**ydotool**

```bash
#!/bin/bash

export YDOTOOL_SOCKET=/tmp/.ydotool_socket

# wait for the desktop and docker to be fully loaded
sleep 15s

# launch chrome in kiosk mode for microphone access
/usr/bin/google-chrome-stable --kiosk --no-first-run --hide-crash-restore-bubble --password-store=basic "http://localhost:3000/phrame?mic" &

# wait for chrome and phrame to load
sleep 5s

# move the mouse to the coordinates and click the left mouse button
ydotool mousemove --absolute 0 0
ydotool click 0xC0
```

**xdotool**

```bash
#!/bin/bash

# wait for the desktop and docker to be fully loaded
sleep 15s

# launch chrome in kiosk mode for microphone access
/usr/bin/google-chrome-stable --kiosk --no-first-run --hide-crash-restore-bubble --password-store=basic "http://localhost:3000/phrame?mic" &

# wait for chrome and phrame to load
sleep 5s

# move the mouse to the coordinates and click the left mouse button
xdotool mousemove --sync 0 0 click 1
```

## Configuration

Configurable options are saved to `/.storage/config/config.yml` and are editable via the UI at [localhost:3000/config](http://localhost:3000/config).

_**Note:** Default values do not need to be specified in configuration unless they need to be overwritten._

### `image`

```yaml
# image settings (default: shown below)

image:
  # time in seconds between image transitions
  interval: 60
  # order of images to display: random, recent
  order: recent
```

### `autogen`

Images can be automatically generated by creating random summaries. This can be scheduled with a cron expression. Keywords can be passed to help guide the summary.

```yaml
# autogen settings (default: shown below)

autogen:
  # schedule as a cron expression for processing transcripts (at every 15th and 45th minute)
  cron: '15,45 * * * *'
  prompt: Provide a random short description to describe a picture. It should be no more than one or two sentences. If keywords are provided select a couple at random to help guide the description.
  # keywords to guide the summary
  keywords: []
```

### `transcript`

Images are generated by processing transcripts. This can be scheduled with a cron expression. All of the transcripts within X minutes will then be processed by OpenAI using `openai.summary.prompt` to summarize the transcripts.

```yaml
# transcript settings (default: shown below)

transcript:
  # schedule as a cron expression for processing transcripts (at every 30th minute)
  cron: '*/30 * * * *'
  # how many minutes of files to look back for (process the last 30 minutes of transcripts)
  minutes: 30
  # minimum number of transcripts required to process
  minimum: 5
```

### `openai`

To configure OpenAI, obtain an [API key](https://platform.openai.com) and add it to your config like the following. All other default settings found bellow will also be applied. You can overwrite the settings by updating your `config.yml` file.

```yaml
# openai settings (default: shown below)

openai:
  # api key
  key:

  summary:
    # model name (https://platform.openai.com/docs/models/overview)
    model: gpt-3.5-turbo
    # prompt used to generate a summary from transcripts
    prompt: You will be given a string of random conversations and need to pull out a few keywords and topics that were talked about. You will then turn this into a short description to describe a picture. It should be no more than two or three sentences.
    # prompt used to generate a random summary
    random: Provide a random short description to describe a picture. It should be no more than two or three sentences.

  image:
    # enable or disable image generation
    enable: true
    # trim letterbox and pillarbox images
    trim: false
    # size of the generated images: 256x256, 512x512, or 1024x1024
    size: 512x512
    # number of images to generate for each style
    n: 1
    # used with summary to guide the image model towards a particular style
    style:
      - cinematic
```

### `midjourney`

_Midjourney currently uses an unofficial third party [package](https://github.com/erictik/midjourney-client). Use this integration at your own risk._

To configure Midjourney, you will need the following:

- [Discord Server](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) ID and Channel ID
  - Obtain by going to your Discord channel in a browser which should follow this pattern - `https://discord.com/channels/SERVER_ID/CHANNEL_ID`
- Invite [Midjourney bot](https://docs.midjourney.com/docs/invite-the-bot) to your server
- While not necessary, it is also recommended to use a [Hugging Face token](https://huggingface.co/docs/hub/security-tokens) for security prompts

All other default settings found bellow will also be applied. You can overwrite the settings by updating your `config.yml` file.

```yaml
# midjourney settings (default: shown below)

midjourney:
  # discord server id
  server_id:
  # discord channel id
  channel_id:
  # discord token (https://linuxhint.com/get-discord-token)
  token:
  # hugging face token (https://huggingface.co/docs/hub/security-tokens)
  hugging_face_token:

  image:
    # enable or disable image generation
    enable: true
    # trim letterbox and pillarbox images
    trim: false
    # options added to a prompt that change how an image generates (https://docs.midjourney.com/docs/parameter-list)
    parameters: --chaos 80 --no text
    # upscale options (false, random, 1,2,3,4)
    upscale: random
    # used with summary to guide the image model towards a particular style
    style:
      - cinematic
```

### `stabilityai`

To configure Stability AI, obtain an [API key](https://platform.stability.ai) and add it to your config like the following. All other default settings found bellow will also be applied. You can overwrite the settings by updating your `config.yml` file.

```yaml
# stabilityai settings (default: shown below)

stabilityai:
  # api key
  key:

  image:
    # enable or disable image generation
    enable: true
    # trim letterbox and pillarbox images
    trim: false
    # number of seconds before the request times out and is aborted
    timeout: 30
    # engined used for image generation
    engine_id: stable-diffusion-512-v2-1
    # width of the image in pixels, must be in increments of 64
    width: 512
    # height of the image in pixels, must be in increments of 64
    height: 512
    # how strictly the diffusion process adheres to the prompt text (higher values keep your image closer to your prompt)
    cfg_scale: 7
    # number of images to generate for each style
    samples: 1
    # number of diffusion steps to run
    steps: 50
    # image model style (https://platform.stability.ai/rest-api#tag/v1generation/operation/textToImage)
    style:
      - cinematic
```

### `deepai`

To configure DeepAI, obtain an [API key](https://deepai.org) and add it to your config like the following. All other default settings found bellow will also be applied. You can overwrite the settings by updating your `config.yml` file.

```yaml
# deepai settings (default: shown below)

deepai:
  # api key
  key:

  image:
    # enable or disable image generation
    enable: true
    # trim letterbox and pillarbox images
    trim: false
    # number of seconds before the request times out and is aborted
    timeout: 30
    # 1 returns one image and 2 returns four images
    grid_size: 1
    # width of the image in pixels, between 128 and 1536
    width: 512
    # height of the image in pixels, between 128 and 1536
    height: 512
    # indicate what you want to be removed from the image
    negative_prompt:
    # image model style (https://deepai.org/machine-learning-model/text2img)
    style:
      - text2img
```

### `dream`

To configure Dream, obtain an [API key](https://api.dream.ai) and add it to your config like the following. All other default settings found bellow will also be applied. You can overwrite the settings by updating your `config.yml` file.

```yaml
# dream settings (default: shown below)

dream:
  # api key
  key:

  image:
    # enable or disable image generation
    enable: true
    # trim letterbox and pillarbox images
    trim: false
    # number of seconds before the request times out and is aborted
    timeout: 30
    # width of the image in pixels
    width: 512
    # height of the image in pixels
    height: 512
    # image model style (https://api.luan.tools/api/styles)
    style:
      - buliojourney v2
```

### `leonardoai`

To configure Leonardo.Ai, obtain an [API key](https://leonardo.ai) and add it to your config like the following. All other default settings found bellow will also be applied. You can overwrite the settings by updating your `config.yml` file.

```yaml
# leonardoai settings (default: shown below)

leonardoai:
  # api key
  key:

  image:
    # enable or disable image generation
    enable: true
    # trim letterbox and pillarbox images
    trim: false
    # number of seconds before the request times out and is aborted
    timeout: 30
    # indicate what you want to be removed from the image
    negative_prompt:
    # model id used for the image generation, if not provided uses sd_version to determine the version of stable diffusion to use
    model_id: 6bef9f1b-29cb-40c7-b9df-32b51c1f67d3
    # base version of stable diffusion to use if not using a custom model
    sd_version: v2
    # number of images to generate for each style
    num_images: 1
    # width of the image in pixels, must be between 32 and 1024 and be a multiple of 8
    width: 512
    # height of the image in pixels, must be between 32 and 1024 and be a multiple of 8
    height: 512
    # number of inference steps to use for the generation, must be between 30 and 60
    num_inference_steps:
    # how strongly the generation should reflect the prompt, must be between 1 and 20.
    guidance_scale: 7
    # scheduler to generate images with
    scheduler:
    # style to generate images with
    preset_style: LEONARDO
    # whether the generated images should tile on all axis
    tiling:
    # whether the generated images should show in the community feed
    public:
    # enable to use prompt magic
    prompt_magic:
    # used with summary to guide the image model towards a particular style
    style:
      - cinematic
```

### `time`

```yaml
# time settings (default: shown below)

time:
  # defaults to iso 8601 format with support for token-based formatting
  # https://github.com/moment/luxon/blob/master/docs/formatting.md#table-of-tokens
  format:
  # time zone used in logs
  timezone: UTC
```

### `logs`

```yaml
# log settings (default: shown below)

logs:
  # options: silent, error, warn, info, http, verbose, debug, silly
  level: info
```

### `telemetry`

```yaml
# telemetry settings (default: shown below)
# self hosted version of plausible.io
# 100% anonymous, used to help improve project
# no cookies and fully compliant with GDPR, CCPA and PECR

telemetry: true
```

## Development

### Run Local Services

| Service | Command                  | URL              |
| ------- | ------------------------ | ---------------- |
| UI      | `npm run local:frontend` | `localhost:8080` |
| API     | `npm run local:api`      | `localhost:3000` |

### Build Local Docker Image

```bash
./.develop/build
```
