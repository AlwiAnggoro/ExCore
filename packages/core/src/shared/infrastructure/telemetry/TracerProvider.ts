import { diag, DiagConsoleLogger, DiagLogLevel, trace, Tracer } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  SpanExporter,
} from '@opentelemetry/sdk-trace-base';

export interface TracerProviderConfig {
  serviceName?: string;
  endpoint?: string;
  processor?: 'simple' | 'batch';
  exporter?: 'console' | 'otlp';
}

let provider: NodeTracerProvider | null = null;

function resolveExporter(exporter: 'console' | 'otlp', endpoint?: string): SpanExporter {
  if (exporter === 'otlp' && endpoint) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
      return new OTLPTraceExporter({ url: endpoint });
    } catch (error) {
      // Fallback to console when OTLP exporter is unavailable
      diag.warn('OTLP exporter not available, falling back to console exporter', error);
    }
  }

  return new ConsoleSpanExporter();
}

function resolveProcessorType(config?: TracerProviderConfig): 'simple' | 'batch' {
  if (config?.processor) {
    return config.processor;
  }

  return process.env.NODE_ENV === 'test' ? 'simple' : 'batch';
}

function resolveExporterType(config?: TracerProviderConfig): 'console' | 'otlp' {
  if (config?.exporter) {
    return config.exporter;
  }

  const envExporter = process.env.OTEL_TRACES_EXPORTER;
  if (envExporter === 'otlp') {
    return 'otlp';
  }

  return 'console';
}

export function initializeTracing(config?: TracerProviderConfig): void {
  if (provider) {
    return;
  }

  if (process.env.OTEL_DIAGNOSTICS_DEBUG === '1') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const serviceName =
    config?.serviceName ?? process.env.OTEL_SERVICE_NAME ?? 'excore-api';
  const exporterType = resolveExporterType(config);
  const exporter = resolveExporter(exporterType, config?.endpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
  const processorType = resolveProcessorType(config);

  provider = new NodeTracerProvider({
    resource: Resource.default().merge(
      new Resource({
        'service.name': serviceName,
      })
    ),
  });

  if (processorType === 'simple') {
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  } else {
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  }

  provider.register({
    propagator: new W3CTraceContextPropagator(),
  });
}

export function getTracer(name = 'rest-api'): Tracer {
  return trace.getTracer(name);
}

export async function shutdownTracing(): Promise<void> {
  if (!provider) {
    return;
  }

  await provider.shutdown();
  provider = null;
}

export function getTracerProvider(): NodeTracerProvider | null {
  return provider;
}
