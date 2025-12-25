import React from 'react';
import { BoardRouteParameters } from '@/app/lib/types';
import { getBoardDetails } from '@/app/lib/data/queries';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import CreateClimbForm from '@/app/components/create-climb/create-climb-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Climb | Boardsesh',
  description: 'Create a new climb on your climbing board',
};

interface CreateClimbPageProps {
  params: Promise<BoardRouteParameters>;
  searchParams: Promise<{ forkFrames?: string; forkName?: string }>;
}

export default async function CreateClimbPage(props: CreateClimbPageProps) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);

  // Check if any parameters are in numeric format (old URLs)
  const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
    param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
  );

  let parsedParams;

  if (hasNumericParams) {
    parsedParams = parseBoardRouteParams(params);
  } else {
    parsedParams = await parseBoardRouteParamsWithSlugs(params);
  }

  const boardDetails = await getBoardDetails(parsedParams);

  return (
    <CreateClimbForm
      boardDetails={boardDetails}
      angle={parsedParams.angle}
      forkFrames={searchParams.forkFrames}
      forkName={searchParams.forkName}
    />
  );
}
