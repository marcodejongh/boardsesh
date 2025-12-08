import React from 'react';
import { BoardRouteParameters } from '@/app/lib/types';
import { getBoardDetails } from '@/app/lib/data/queries';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import CreateClimbForm from '@/app/components/create-climb/create-climb-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Climb | BoardSesh',
  description: 'Create a new climb on your climbing board',
};

export default async function CreateClimbPage(props: { params: Promise<BoardRouteParameters> }) {
  const params = await props.params;

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

  return <CreateClimbForm boardDetails={boardDetails} angle={parsedParams.angle} />;
}
