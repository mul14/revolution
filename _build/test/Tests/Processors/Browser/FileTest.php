<?php
/**
 * MODx Revolution
 *
 * Copyright 2006-2010 by the MODx Team.
 * All rights reserved.
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; either version 2 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 *
 * @package modx-test
 */
/**
 * Tests related to browser/file/ processors
 *
 * @package modx-test
 * @subpackage modx
 * @group Processors
 * @group BrowserProcessors
 */
class BrowserFileProcessorsTest extends MODxTestCase {
    const PROCESSOR_LOCATION = 'browser/file/';

    /**
     * Tests the browser/file/get processor, which grabs a file
     * @dataProvider providerGet
     * @param string $file The file to grab.
     */
    public function testGet($file = '') {
        if (empty($file)) {
            $this->fail('No provider data for BrowserFile::get');
        }

        $this->modx->setOption('filemanager_path','');
        $this->modx->setOption('filemanager_url','');
        $this->modx->setOption('rb_base_dir','');
        $this->modx->setOption('rb_base_url','');

        $result = $this->modx->runProcessor(self::PROCESSOR_LOCATION.'get',array(
           'file' => MODX_BASE_PATH.$file,
        ));
        $this->assertTrue($this->checkForSuccess($result));
    }
    /**
     * Data provider for get processor test.
     */
    public function providerGet() {
        return array(
            array('manager/index.php'),  
        );
    }
}