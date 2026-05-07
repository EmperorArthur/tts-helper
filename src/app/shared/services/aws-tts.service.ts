import { getSynthesizeSpeechUrl } from '@aws-sdk/polly-request-presigner';
import { PollyClient } from '@aws-sdk/client-polly';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { SynthesizeSpeechInput } from '@aws-sdk/client-polly/dist-types/models/models_0';
import { XhrHttpHandler } from "@aws-sdk/xhr-http-handler";

import { AmazonPollyData } from "../state/config/config.feature";
import { Logger } from "@smithy/types";

/**
 * Service for Amazon Polly Text-to-Speech integration.
 *
 * This service provides functionality to generate presigned URLs for synthesized speech
 * using Amazon Polly. It handles AWS Cognito authentication and configures the Polly client
 * with the provided credentials and region settings.
 *
 * Amazon Polly is a pay-as-you-use TTS service with competitive pricing and fast response times.
 */
export class AwsTtsService {
    private readonly logger: Logger;
    public readonly pollyConfig: AmazonPollyData;

    public constructor(pollyConfig: AmazonPollyData, logger: Logger) {
        if (!pollyConfig.poolId) {
            throw new Error(`Oops! You didn't provide a Pool ID for Amazon Polly.`);
        }

        this.pollyConfig = pollyConfig;
        this.logger = logger;
    }

    private async getCredentials() {
        return await fromCognitoIdentityPool({
            logger: this.logger,
            clientConfig: {
                region: this.pollyConfig.region,
                logger: this.logger,
                userAgentAppId: "TTS Helper",
                requestHandler: new XhrHttpHandler(),
            },
            identityPoolId: this.pollyConfig.poolId.trim(),
        })();
    }

    public async getFileURI(audioText: string) {
        const pollyParams = {
            OutputFormat: 'mp3',
            SampleRate: '22050',
            Text: audioText,
            TextType: 'text',
            VoiceId: this.pollyConfig.voice,
        } satisfies SynthesizeSpeechInput;
        this.logger.debug(`pollyParams:\n${JSON.stringify(pollyParams)}`, 'AwsTtsService');

        const credentials = await this.getCredentials();
        this.logger.debug(`AWS Credentials:\n${JSON.stringify(credentials)}`, 'AwsTtsService');

        const pollyClient = new PollyClient({
            logger: this.logger,
            region: this.pollyConfig.region,
            credentials: credentials,
            requestHandler: new XhrHttpHandler(),
        });

        const url = await getSynthesizeSpeechUrl({
            client: pollyClient,
            params: pollyParams,
        });
        this.logger.debug(`TTS URI: ${url}`, 'AwsTtsService');

        return url.toString();
    }
}
