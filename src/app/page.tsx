import { LocalSpaceApp } from '@/components/LocalSpaceApp';
import {
  getDataSourceMeta,
  loadCommercialData,
  loadPopulationData,
  loadVerificationArtifacts,
} from '@/lib/dataLoader';

export default function HomePage() {
  const stores = loadCommercialData();
  const populations = loadPopulationData();
  const meta = getDataSourceMeta(stores, populations);
  const { rScript, dataCsv } = loadVerificationArtifacts();

  return (
    <LocalSpaceApp
      stores={stores}
      populations={populations}
      meta={meta}
      rScriptContent={rScript}
      dataCsvContent={dataCsv}
    />
  );
}
