import { _decorator, EventMouse, instantiate, Prefab, UITransform, Vec2, Vec3 } from 'cc';
import { UIComp } from '../../framework/ui/UIComp';
import { MapMgr } from '../base/MapMgr';
import { ColorGrid } from './grid/ColorGrid';
import { BaseUT } from '../../framework/base/BaseUtil';
const { ccclass, property } = _decorator;
/*
 * @Descripttion: 网格绘制工厂
 * @Author: CYK
 * @Date: 2023-06-30 23:00:00
 */
@ccclass('MapGridFactory')
export class MapGridFactory extends UIComp {
    @property({ type: Prefab })
    public colorGrid: Prefab;

    private mapMgr: MapMgr;
    private _scrollMapUITranstorm: UITransform;
    /**区域格子Graphic缓存map */
    private _graphicsDic: { [areaKey: string]: ColorGrid };
    private _colorDic: { [gridType: string]: string };
    /**删除格子时涉及到的区域临时map */
    private _redrawTempMap: { [graphicKey: string]: string };
    protected onEnter(): void {
        let self = this;
        self.mapMgr = MapMgr.inst;
        self._scrollMapUITranstorm = self.node.parent.getComponent(UITransform);
    }

    public init() {
        let self = this;
        self._graphicsDic = {};
        self._colorDic = {};
    }

    public onAddNodeHandler(e: EventMouse) {
        let self = this;
        self.addOrRmRangeGrid(e.getLocation(), true);
    }

    public onRemoveNodeHandler(e: EventMouse) {
        let self = this;
        self.addOrRmRangeGrid(e.getLocation(), false);
    }

    /**添加或者删除格子 */
    private addOrRmRangeGrid(location: Vec2, isAdd: boolean) {
        let self = this;
        let range = self.mapMgr.gridRange;
        let mousePos = BaseUT.getMousePos(location);//这里不直接取evt.getLocation()，再封装一层是因为舞台缩放，会影响evt.getLocation()的坐标） 
        let localUIPos = self._scrollMapUITranstorm.convertToNodeSpaceAR(new Vec3(mousePos.x, mousePos.y, 0));
        let gridPos = self.mapMgr.pos2Grid(localUIPos.x, localUIPos.y);
        self._redrawTempMap = {};
        if (range == 0) {
            if (isAdd) {
                self.addGrid(gridPos);
            } else {
                self.removeGrid(gridPos);
            }
        } else {
            let numCols = self.mapMgr.totCol;
            let numRows = self.mapMgr.totRow;
            let startCol = Math.max(0, gridPos.x - range);
            let endCol = Math.min(numCols - 1, gridPos.x + range);
            let startRow = Math.max(0, gridPos.y - range);
            let endRow = Math.min(numRows - 1, gridPos.y + range);
            for (let i = startCol; i <= endCol; i++) {
                for (let j = startRow; j <= endRow; j++) {
                    if (isAdd) {
                        self.addGrid({ x: i, y: j });
                    } else {
                        self.removeGrid({ x: i, y: j });
                    }
                }
            }
        }
        if (!isAdd) self.drawGraphic();//移除格子时，删除数据后，重新绘制感兴趣区域的所有格子
    }

    /**
     * 添加指定行列的格子
     * @param gridPos 格子行列
     * @returns 
     */
    private addGrid(gridPos: { x: number, y: number }) {
        let self = this;
        let mapMgr = self.mapMgr;
        let gridType = self.mapMgr.gridType;
        let gridKey = gridPos.x + "_" + gridPos.y;
        let graphicsPos = { x: Math.floor(gridPos.x / mapMgr.areaGraphicSize), y: Math.floor(gridPos.y / mapMgr.areaGraphicSize) };
        let gridDataMap = mapMgr.gridDataMap;
        let areaKey = graphicsPos.x + '_' + graphicsPos.y;
        if (!gridDataMap[gridType]) gridDataMap[gridType] = {};
        if (!gridDataMap[gridType][areaKey]) gridDataMap[gridType][areaKey] = {};
        if (gridDataMap[gridType][areaKey][gridKey]) return; //已有格子
        gridDataMap[gridType][areaKey][gridKey] = gridKey;
        let color = self._colorDic[gridType] = mapMgr.getColorByType(gridType);
        let cellSize = mapMgr.cellSize;
        let graphicsKey = gridType + '_' + areaKey;
        let graphics = self.getGraphic(graphicsKey);
        graphics.drawRect(color, gridPos.x * cellSize, gridPos.y * cellSize, cellSize, cellSize);
    }

    /**
     * 清除指定行列的格子
     * @param gridPos 格子行列
     * @returns 
     */
    private removeGrid(gridPos: { x: number, y: number }) {
        let self = this;
        let mapMgr = self.mapMgr;
        let gridType = self.mapMgr.gridType;
        let gridKey = gridPos.x + "_" + gridPos.y;
        let gridDataMap = mapMgr.gridDataMap;
        let graphicsPos = { x: Math.floor(gridPos.x / mapMgr.areaGraphicSize), y: Math.floor(gridPos.y / mapMgr.areaGraphicSize) };
        let areaKey = graphicsPos.x + '_' + graphicsPos.y;

        if (gridDataMap[gridType] && gridDataMap[gridType][areaKey] && gridDataMap[gridType][areaKey][gridKey]) {
            delete gridDataMap[gridType][areaKey][gridKey];
            self._redrawTempMap[gridType + '|' + areaKey] = gridType + '_' + areaKey;
        }
    }

    private drawGraphic() {
        let self = this;
        let gridDataMap = self.mapMgr.gridDataMap;
        let cellSize = self.mapMgr.cellSize;
        for (let key in self._redrawTempMap) {
            let splitKey = key.split('|');
            let gridType = splitKey[0];
            let areaKey = splitKey[1];
            let graphicsKey = self._redrawTempMap[key];
            let graphics = self.getGraphic(graphicsKey);
            graphics.clear();
            let color = self._colorDic[gridType];
            let areaGridDataMap = gridDataMap[gridType][areaKey];
            if (areaGridDataMap) {
                for (let gridKey in areaGridDataMap) {
                    let spltGridPosKey = gridKey.split("_");
                    graphics.drawRect(color, Number(spltGridPosKey[0]) * cellSize, Number(spltGridPosKey[1]) * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    private getGraphic(key: string): ColorGrid {
        let self = this;
        if (!self._graphicsDic[key]) {
            let colorGrid = instantiate(self.colorGrid);
            colorGrid.setParent(self.node);
            let graphics = colorGrid.getComponent(ColorGrid);
            self._graphicsDic[key] = graphics;
        }
        return self._graphicsDic[key];
    }
}

